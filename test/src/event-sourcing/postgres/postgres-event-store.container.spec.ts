import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrencyError, DomainEvent, PostgresEventStore } from '@market-monster/event-sourcing';
import { eventStoreContract } from '../event-store.contract';
import { eventsContract } from '../events.contract';
import { PostgresHarness, startPostgres } from './testcontainer';

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

eventStoreContract('PostgresEventStore', () => new PostgresEventStore(pg.pool));

eventsContract('PostgresEventStore', () => {
  const store = new PostgresEventStore(pg.pool);
  return { writer: store, events: store };
});

describe('PostgresEventStore under real concurrency', () => {
  it('serializes concurrent same-stream appends — one wins, one conflicts', async () => {
    const store = new PostgresEventStore(pg.pool);

    const results = await Promise.allSettled([
      store.append('stream-1', [dummyEvent('A')], 0),
      store.append('stream-1', [dummyEvent('B')], 0),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConcurrencyError);
    expect(await store.load('stream-1')).toHaveLength(1);
  });
});

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {}, version: 1 };
}
