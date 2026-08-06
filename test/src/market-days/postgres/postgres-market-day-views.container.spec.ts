import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresMarketDayViews } from '@market-miam/market-days';
import { marketDayViewsContract } from '../market-day-views.contract';
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

marketDayViewsContract('PostgresMarketDayViews', () => new PostgresMarketDayViews(pg.pool));
