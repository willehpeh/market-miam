import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresMarketPricesViews } from '@market-miam/market-days';
import { marketPricesViewsContract } from '../market-prices-views.contract';
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

marketPricesViewsContract('PostgresMarketPricesViews', () => new PostgresMarketPricesViews(pg.pool));
