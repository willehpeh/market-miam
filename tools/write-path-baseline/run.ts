// The write-path baseline finding M6 asks for (docs/findings/m6-write-path-scaling-ceilings.md):
// appends per second under the global advisory lock (ADR 0028), command cost as a
// stream grows, and how long the lock is held when an append joins a processor's
// transaction (W2, ADR 0035). It drives the real Postgres adapters — no fakes, no
// domain logic — so the numbers are the event store's own.
//
//   DATABASE_URL=postgres://… npm run baseline:write-path
//   RTT_MS=1 DATABASE_URL=… npm run baseline:write-path
//
// DATABASE_URL must name a throwaway database: the script applies the migrations and
// TRUNCATEs every table between scenarios, and refuses to start if the events table
// already holds rows. RTT_MS puts delay-proxy.mjs in front of the database, half the
// round trip each way. DATABASE_POOL_MAX defaults to 10, the API's own default.
import { execSync, fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { Pool } from 'pg';
import {
  DomainEvent,
  EventStore,
  MasterKeyring,
  PostgresDataKeys,
  PostgresEventStore,
  PostgresUnitOfWork,
  ShreddingEventStore,
} from '../../packages/event-sourcing/src';

const MIGRATIONS_DIR = join(__dirname, '../../database/migrations');
const PROXY_PORT = 55433;
const SECONDS = Number(process.env['BASELINE_SECONDS'] ?? 10);
const POOL_MAX = Number(process.env['DATABASE_POOL_MAX'] ?? 10);
const RTT_MS = Number(process.env['RTT_MS'] ?? 0);

// The same registry entry the API seals StorefrontInformationEdited under
// (vendorPiiFields), so a PII-bearing stream costs what a real one does.
const PII = { StorefrontInformationEdited: ['name', 'description', 'phone'] };
const METADATA = { vendorId: 'baseline-vendor' };

type Stats = { p50: number; p95: number; p99: number };

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required, and must name a throwaway database');
  }
  await migrate(databaseUrl);
  const proxy = RTT_MS > 0 ? await startProxy(databaseUrl) : null;
  const pool = new Pool({ connectionString: proxy?.url ?? databaseUrl, max: POOL_MAX });
  const unitOfWork = new PostgresUnitOfWork(pool);
  const plain = new PostgresEventStore(pool, unitOfWork);
  const keys = new PostgresDataKeys(pool, MasterKeyring.single(randomBytes(32)));
  const shredding = new ShreddingEventStore(plain, keys, PII, 'vendorId');

  try {
    await header(pool);
    await reset(pool);

    console.log('\n## Throughput under the global lock\n');
    console.log('| Writers | Appends/s | p50 ms | p95 ms | p99 ms |');
    console.log('| --- | --- | --- | --- | --- |');
    await throughput(plain, 1, 1); // warm-up, discarded
    for (const writers of [1, 2, 4, 8, 16]) {
      const { perSecond, stats } = await throughput(plain, writers, SECONDS);
      console.log(`| ${writers} | ${perSecond.toFixed(0)} | ${row(stats)} |`);
    }
    await reset(pool);

    console.log('\n## Command cost as a stream grows\n');
    console.log('| Stream | Events | load p50 ms | load p95 ms | append p50 ms | append p95 ms |');
    console.log('| --- | --- | --- | --- | --- | --- |');
    for (const [label, store, type] of [
      ['plain', plain, 'ItemRevised'],
      ['PII', shredding, 'StorefrontInformationEdited'],
    ] as const) {
      for (const length of [100, 1_000, 10_000]) {
        const { load, append } = await streamLength(store, `${label}-${length}`, type, length);
        console.log(`| ${label} | ${length.toLocaleString('en')} | ${ms(load.p50)} | ${ms(load.p95)} | ${ms(append.p50)} | ${ms(append.p95)} |`);
      }
    }
    await reset(pool);

    console.log('\n## Lock held through a processor transaction\n');
    console.log('Four writers append on their own while one processor appends inside a transaction, then works for a while before committing.\n');
    console.log('| Work after the append | Writers appends/s | Writers p50 ms | Writers p99 ms | Processor transactions/s |');
    console.log('| --- | --- | --- | --- | --- |');
    for (const work of [0, 5, 20]) {
      const result = await processorHold(plain, unitOfWork, work);
      console.log(`| ${work} ms | ${result.perSecond.toFixed(0)} | ${ms(result.stats.p50)} | ${ms(result.stats.p99)} | ${result.processorPerSecond.toFixed(0)} |`);
    }
    await reset(pool);
  } finally {
    await pool.end();
    proxy?.stop();
  }
}

// N writers, each on its own stream, append one event at a time for `seconds`. Their
// streams never contend, so whatever stops throughput rising with N is the lock.
async function throughput(store: EventStore, writers: number, seconds: number): Promise<{ perSecond: number; stats: Stats }> {
  const latencies: number[] = [];
  const deadline = performance.now() + seconds * 1_000;
  await Promise.all(
    Array.from({ length: writers }, async (_, writer) => {
      const stream = `throughput-${writers}-${writer}-${randomBytes(4).toString('hex')}`;
      for (let position = 0; performance.now() < deadline; position++) {
        const start = performance.now();
        await store.append(stream, [catalogueEvent(position)], position);
        latencies.push(performance.now() - start);
      }
    }),
  );
  return { perSecond: latencies.length / seconds, stats: percentiles(latencies) };
}

// Fill one stream to `length`, then time what every command on it pays: a full
// load() to rehydrate, and an append whose concurrency check counts the stream.
async function streamLength(store: EventStore, stream: string, type: string, length: number): Promise<{ load: Stats; append: Stats }> {
  for (let position = 0; position < length; position += 500) {
    const batch = Array.from({ length: Math.min(500, length - position) }, (_, i) => eventOf(type, position + i));
    await store.append(stream, batch, position, METADATA);
  }
  const loads: number[] = [];
  for (let i = 0; i < (length >= 10_000 ? 10 : 50); i++) {
    const start = performance.now();
    await store.load(stream);
    loads.push(performance.now() - start);
  }
  const appends: number[] = [];
  for (let position = length; position < length + 50; position++) {
    const start = performance.now();
    await store.append(stream, [eventOf(type, position)], position, METADATA);
    appends.push(performance.now() - start);
  }
  return { load: percentiles(loads), append: percentiles(appends) };
}

// An append inside a unit of work joins it (ADR 0035), so the advisory lock is held
// until the processor's COMMIT. `work` stands in for whatever the processor does
// after its command appends: the checkpoint write, a second command, a slow query.
async function processorHold(
  store: EventStore,
  unitOfWork: PostgresUnitOfWork,
  work: number,
): Promise<{ perSecond: number; stats: Stats; processorPerSecond: number }> {
  const deadline = performance.now() + SECONDS * 1_000;
  const processorStream = `processor-${work}-${randomBytes(4).toString('hex')}`;
  let processed = 0;
  const processor = (async () => {
    for (let position = 0; performance.now() < deadline; position++) {
      await unitOfWork.transaction(async () => {
        await store.append(processorStream, [catalogueEvent(position)], position);
        await sleep(work);
      });
      processed++;
    }
  })();
  const writers = throughputUntil(store, 4, deadline);
  const [{ latencies }] = await Promise.all([writers, processor]);
  return { perSecond: latencies.length / SECONDS, stats: percentiles(latencies), processorPerSecond: processed / SECONDS };
}

async function throughputUntil(store: EventStore, writers: number, deadline: number): Promise<{ latencies: number[] }> {
  const latencies: number[] = [];
  await Promise.all(
    Array.from({ length: writers }, async (_, writer) => {
      const stream = `writer-${writer}-${randomBytes(4).toString('hex')}`;
      for (let position = 0; performance.now() < deadline; position++) {
        const start = performance.now();
        await store.append(stream, [catalogueEvent(position)], position);
        latencies.push(performance.now() - start);
      }
    }),
  );
  return { latencies };
}

function eventOf(type: string, position: number): DomainEvent {
  return type === 'StorefrontInformationEdited' ? storefrontEvent(position) : catalogueEvent(position);
}

// Roughly the size of a real catalogue revision: an id, a name, a description, a price.
function catalogueEvent(position: number): DomainEvent {
  return {
    type: 'ItemRevised',
    version: 1,
    payload: {
      itemId: `item-${position % 40}`,
      name: 'Tajine d’agneau aux pruneaux',
      description: 'Agneau mijoté sept heures, pruneaux, amandes grillées, semoule fine. '.repeat(2),
      price: 1250,
    },
  };
}

function storefrontEvent(position: number): DomainEvent {
  return {
    type: 'StorefrontInformationEdited',
    version: 1,
    payload: {
      name: `Chez Mohamed ${position}`,
      description: 'Cuisine du Maghreb sur les marchés de Lyon, du mardi au dimanche. '.repeat(2),
      phone: '06 12 34 56 78',
    },
  };
}

async function migrate(databaseUrl: string): Promise<void> {
  const check = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const { rows } = await check.query<{ present: string | null }>(`SELECT to_regclass('public.events') AS present`);
    if (rows[0].present) {
      const { rows: count } = await check.query<{ n: string }>('SELECT count(*) AS n FROM events');
      if (Number(count[0].n) > 0) {
        throw new Error('The events table already holds rows: point DATABASE_URL at a throwaway database');
      }
    }
  } finally {
    await check.end();
  }
  // node-pg-migrate ships as ESM only; the CommonJS build reaches it through import().
  const { runner } = await import('node-pg-migrate');
  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    count: Infinity,
    migrationsTable: 'pgmigrations',
    log: () => undefined,
  });
}

async function reset(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ tables: string }>(
    `SELECT string_agg(quote_ident(tablename), ', ') AS tables
     FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`,
  );
  await pool.query(`TRUNCATE ${rows[0].tables} RESTART IDENTITY`);
}

async function header(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ version: string }>('SELECT version()');
  const pings: number[] = [];
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    await pool.query('SELECT 1');
    pings.push(performance.now() - start);
  }
  console.log('# Write-path baseline\n');
  console.log(`- Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`- Commit: ${execSync('git rev-parse --short HEAD').toString().trim()}`);
  console.log(`- Postgres: ${rows[0].version.split(' on ')[0]}`);
  console.log(`- Node ${process.version}, ${cpus().length} CPUs, pool max ${POOL_MAX}`);
  console.log(`- SELECT 1 round trip: p50 ${ms(percentiles(pings).p50)} ms${RTT_MS > 0 ? ` (through the proxy, RTT_MS=${RTT_MS})` : ''}`);
  console.log(`- ${SECONDS} s per throughput run`);
}

async function startProxy(databaseUrl: string): Promise<{ url: string; stop: () => void }> {
  const target = new URL(databaseUrl);
  const child = fork(join(__dirname, 'delay-proxy.mjs'), [String(PROXY_PORT), target.hostname, target.port || '5432', String(RTT_MS / 2)], {
    execArgv: [],
  });
  await new Promise<void>((resolve, reject) => {
    child.once('message', () => resolve());
    child.once('error', reject);
  });
  const url = new URL(databaseUrl);
  url.hostname = '127.0.0.1';
  url.port = String(PROXY_PORT);
  return { url: url.toString(), stop: () => child.kill() };
}

function percentiles(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}

function row(stats: Stats): string {
  return `${ms(stats.p50)} | ${ms(stats.p95)} | ${ms(stats.p99)}`;
}

function ms(value: number): string {
  return value < 10 ? value.toFixed(2) : value.toFixed(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
