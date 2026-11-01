import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresSubdomainRegistry } from '@market-miam/market-days';
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

const seed = (subdomain: string, vendorId: string) =>
  pg.pool.query('INSERT INTO subdomain_registry (subdomain, vendor_id) VALUES ($1, $2)', [subdomain, vendorId]);

describe('PostgresSubdomainRegistry', () => {
  it('resolves a seeded subdomain to its vendor', async () => {
    await seed('acme', 'acme-bakery');
    expect(await new PostgresSubdomainRegistry(pg.pool).vendorFor('acme')).toBe('acme-bakery');
  });

  it('returns undefined for an unknown subdomain', async () => {
    expect(await new PostgresSubdomainRegistry(pg.pool).vendorFor('nobody')).toBeUndefined();
  });

  it('resolves a mixed-case lookup against a lower-case row', async () => {
    await seed('acme', 'acme-bakery');
    expect(await new PostgresSubdomainRegistry(pg.pool).vendorFor('ACME')).toBe('acme-bakery');
  });

  it('removes a vendor so its subdomain no longer resolves', async () => {
    await seed('acme', 'acme-bakery');
    const registry = new PostgresSubdomainRegistry(pg.pool);
    await registry.removeFor('acme-bakery');
    expect(await registry.vendorFor('acme')).toBeUndefined();
  });

  it('rejects a second subdomain for the same vendor', async () => {
    await seed('acme', 'acme-bakery');
    await expect(seed('bistro', 'acme-bakery')).rejects.toThrow();
  });

  it('resolves a vendor to its seeded subdomain', async () => {
    await seed('acme', 'acme-bakery');
    expect(await new PostgresSubdomainRegistry(pg.pool).subdomainFor('acme-bakery')).toBe('acme');
  });

  it('returns undefined for a vendor with no subdomain', async () => {
    expect(await new PostgresSubdomainRegistry(pg.pool).subdomainFor('nobody')).toBeUndefined();
  });

  it('lists every assignment, ordered by subdomain', async () => {
    await seed('brioche', 'brioche-co');
    await seed('acme', 'acme-bakery');

    expect(await new PostgresSubdomainRegistry(pg.pool).assignments()).toEqual([
      { subdomain: 'acme', vendorId: 'acme-bakery' },
      { subdomain: 'brioche', vendorId: 'brioche-co' },
    ]);
  });

  it('lists no assignments before any is made', async () => {
    expect(await new PostgresSubdomainRegistry(pg.pool).assignments()).toEqual([]);
  });
});
