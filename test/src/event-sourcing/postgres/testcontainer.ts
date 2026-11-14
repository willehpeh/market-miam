import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../database/migrations', import.meta.url));

export interface PostgresHarness {
  pool: Pool;
  connectionString: string;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

// Starts a throwaway Postgres, applies the real production migrations, and hands
// back a pool. The same container is shared across a spec; `reset()` truncates
// between tests (TRUNCATE bypasses the append-only trigger by design).
//
// TEST_POSTGRES_URL names a database to use instead, on a machine with Postgres and no
// Docker. It is migrated and emptied first, so only a database named `…_test` is taken.
export async function startPostgres(): Promise<PostgresHarness> {
  const existing = process.env['TEST_POSTGRES_URL'];
  if (existing && !new URL(existing).pathname.endsWith('_test')) {
    throw new Error('TEST_POSTGRES_URL must name a throwaway database ending in _test: the harness empties it.');
  }
  const container: StartedPostgreSqlContainer | undefined = existing
    ? undefined
    : await new PostgreSqlContainer('postgres:16').start();
  const databaseUrl = existing ?? container!.getConnectionUri();

  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    count: Infinity,
    migrationsTable: 'pgmigrations',
  });

  const pool = new Pool({ connectionString: databaseUrl });

  // Read the table list from the migrated schema rather than naming tables here: a hand-kept
  // list silently stops truncating the newest read model, and a stale row only shows up in
  // whichever test later reads a range instead of a key it just wrote.
  const { rows } = await pool.query<{ tables: string }>(
    `SELECT string_agg(quote_ident(tablename), ', ') AS tables
     FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`,
  );
  const tables = rows[0].tables;
  const reset = async () => {
    await pool.query(`TRUNCATE ${tables} RESTART IDENTITY`);
  };
  if (existing) {
    await reset();
  }

  return {
    pool,
    connectionString: databaseUrl,
    reset,
    stop: async () => {
      await pool.end();
      await container?.stop();
    },
  };
}
