import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresVendorStorefrontViews } from '@market-miam/market-days';
import { vendorStorefrontViewsContract } from '../vendor-storefront-views.contract';
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

vendorStorefrontViewsContract('PostgresVendorStorefrontViews', () => new PostgresVendorStorefrontViews(pg.pool));
