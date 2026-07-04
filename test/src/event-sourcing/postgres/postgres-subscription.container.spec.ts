import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresCheckpoint } from '@market-monster/event-sourcing';
import { checkpointContract } from '../checkpoint.contract';
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
