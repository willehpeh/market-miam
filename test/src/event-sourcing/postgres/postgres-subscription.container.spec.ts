import { afterAll, beforeAll, beforeEach } from 'vitest';
import {
  PollingSubscription,
  PostgresCheckpoint,
  PostgresEventStore,
} from '@market-monster/event-sourcing';
import { checkpointContract } from '../checkpoint.contract';
import { subscriptionContract } from '../subscription.contract';
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

checkpointContract('PostgresCheckpoint', () => new PostgresCheckpoint(pg.pool, 'test'));

subscriptionContract('PollingSubscription over Postgres', () => {
  const store = new PostgresEventStore(pg.pool);
  return {
    writer: store,
    subscribe: (handler) =>
      new PollingSubscription(store, handler, new PostgresCheckpoint(pg.pool, 'sub-1')),
  };
});
