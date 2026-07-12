import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PostgresCatalogueViews } from '@market-miam/market-days';
import { catalogueViewsContract } from '../catalogue-views.contract';
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

catalogueViewsContract('PostgresCatalogueViews', () => new PostgresCatalogueViews(pg.pool));
