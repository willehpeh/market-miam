import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresMarketScheduleViews } from '@market-miam/market-days';
import { marketScheduleViewsContract } from '../market-schedule-views.contract';
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

marketScheduleViewsContract('PostgresMarketScheduleViews', () => new PostgresMarketScheduleViews(pg.pool));
