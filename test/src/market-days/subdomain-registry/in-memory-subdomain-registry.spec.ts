import { describe, expect, it } from 'vitest';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';

describe('InMemorySubdomainRegistry', () => {
  it('resolves a registered subdomain to its vendor', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('acme', 'acme-bakery');
    expect(await registry.vendorFor('acme')).toBe('acme-bakery');
  });

  it('returns undefined for an unknown subdomain', async () => {
    const registry = new InMemorySubdomainRegistry();
    expect(await registry.vendorFor('nobody')).toBeUndefined();
  });

  it('resolves a mixed-case lookup against a lower-case registration', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('acme', 'acme-bakery');
    expect(await registry.vendorFor('ACME')).toBe('acme-bakery');
  });

  it('resolves a lower-case lookup against a mixed-case registration', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('ACME', 'acme-bakery');
    expect(await registry.vendorFor('acme')).toBe('acme-bakery');
  });

  it('removes a vendor so its subdomain no longer resolves', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('acme', 'acme-bakery');
    await registry.removeFor('acme-bakery');
    expect(await registry.vendorFor('acme')).toBeUndefined();
  });
});
