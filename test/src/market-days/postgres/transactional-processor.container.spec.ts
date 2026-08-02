import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import {
  Checkpoint,
  DomainEvent,
  EventHandler,
  PollingSubscription,
  PostgresCheckpoint,
  PostgresEventStore,
  PostgresUnitOfWork,
  StoredEvent,
} from '@market-miam/event-sourcing';
import { PostgresHarness, startPostgres } from '../../event-sourcing/postgres/testcontainer';

let pg: PostgresHarness;

beforeAll(async () => {
  pg = await startPostgres();
});

afterAll(async () => {
  await pg?.stop();
});

beforeEach(async () => {
  await pg.reset();
});

const registered: DomainEvent = { type: 'VendorRegistered', payload: { vendorId: 'v1' }, version: 1 };
const opened: DomainEvent = { type: 'StorefrontOpened', payload: { vendorId: 'v1' }, version: 1 };

// A processor at its essence: handling an event dispatches a command whose handler
// load-then-appends to another stream, through the same store the subscription
// drives. W2 pins that those appends join the subscription's transaction — durable
// atomically with the checkpoint, or not at all.
class OpeningProcessor implements EventHandler {
  constructor(private readonly events: PostgresEventStore) {}

  async handle(_event: StoredEvent): Promise<void> {
    const current = await this.events.load('storefront-v1');
    await this.events.append('storefront-v1', [opened], current.length, { vendorId: 'v1' });
  }

  eventTypes(): string[] {
    return ['VendorRegistered'];
  }
}

class FailingCheckpoint extends Checkpoint {
  read(): Promise<number> {
    return Promise.resolve(0);
  }
  advance(_from: number, _to: number): Promise<void> {
    return Promise.reject(new Error('checkpoint advance failed'));
  }
  reset(): Promise<void> {
    return Promise.reject(new Error('checkpoint reset failed'));
  }
}

describe('transactional processor ↔ checkpoint', () => {
  it('commits the command appends and the checkpoint together on success', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool, uow);
    const checkpoint = new PostgresCheckpoint(uow, 'opens-storefronts');
    await events.append('vendor-v1', [registered], 0, { vendorId: 'v1' });

    await new PollingSubscription(events, new OpeningProcessor(events), checkpoint, { unitOfWork: uow }).poll();

    expect((await events.load('storefront-v1')).map((e) => e.type)).toEqual(['StorefrontOpened']);
    expect(await checkpoint.read()).toBeGreaterThan(0);
  });

  it('rolls back the command appends when the checkpoint fails, then appends exactly once on retry', async () => {
    const uow = new PostgresUnitOfWork(pg.pool);
    const events = new PostgresEventStore(pg.pool, uow);
    const processor = new OpeningProcessor(events);
    await events.append('vendor-v1', [registered], 0, { vendorId: 'v1' });

    // First poll: the checkpoint advance throws inside the per-event tx → the appended
    // events roll back with it, exactly the W2 hole (they used to stay durable).
    await expect(new PollingSubscription(events, processor, new FailingCheckpoint(), { unitOfWork: uow }).poll()).rejects.toThrow();
    expect(await events.load('storefront-v1')).toHaveLength(0);

    // The checkpoint never advanced, so a clean retry re-dispatches and appends exactly once.
    const checkpoint = new PostgresCheckpoint(uow, 'opens-storefronts');
    await new PollingSubscription(events, processor, checkpoint, { unitOfWork: uow }).poll();

    expect((await events.load('storefront-v1')).map((e) => e.type)).toEqual(['StorefrontOpened']);
    expect(await checkpoint.read()).toBeGreaterThan(0);
  });

  it('needs no second connection: a processor polls to completion on a max-1 pool', async () => {
    // Before W2, the append inside the transaction acquired a second client while the
    // transaction held the only one — with no acquire timeout, this deadlocked forever.
    const pool = new Pool({ connectionString: pg.connectionString, max: 1 });
    try {
      const uow = new PostgresUnitOfWork(pool);
      const events = new PostgresEventStore(pool, uow);
      const checkpoint = new PostgresCheckpoint(uow, 'opens-storefronts');
      await events.append('vendor-v1', [registered], 0, { vendorId: 'v1' });

      await new PollingSubscription(events, new OpeningProcessor(events), checkpoint, { unitOfWork: uow }).poll();

      expect((await events.load('storefront-v1')).map((e) => e.type)).toEqual(['StorefrontOpened']);
      expect(await checkpoint.read()).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }
  });
});
