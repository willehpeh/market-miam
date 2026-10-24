import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresVendorLegalIdentityViews } from '@market-miam/market-days';
import { vendorLegalIdentityViewsContract } from '../vendor-legal-identity-views.contract';
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

vendorLegalIdentityViewsContract('PostgresVendorLegalIdentityViews', () => new PostgresVendorLegalIdentityViews(pg.pool));
