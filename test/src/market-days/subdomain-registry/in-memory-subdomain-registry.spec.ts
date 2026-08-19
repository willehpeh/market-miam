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

  // Erasure is per vendor, and the registry is one map across all of them (PRIVACY-PLAN 2b).
  it('leaves another vendor\'s subdomain registered when one is removed', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('acme', 'acme-bakery');
    await registry.register('brioche', 'brioche-co');

    await registry.removeFor('acme-bakery');

    expect(await registry.vendorFor('brioche')).toEqual('brioche-co');
  });

  it('resolves a vendor to its registered subdomain', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('acme', 'acme-bakery');
    expect(await registry.subdomainFor('acme-bakery')).toBe('acme');
  });

  it('returns undefined for a vendor with no subdomain', async () => {
    const registry = new InMemorySubdomainRegistry();
    expect(await registry.subdomainFor('nobody')).toBeUndefined();
  });

  it('resolves a vendor to the normalised lower-case subdomain it was registered with', async () => {
    const registry = new InMemorySubdomainRegistry();
    await registry.register('ACME', 'acme-bakery');
    expect(await registry.subdomainFor('acme-bakery')).toBe('acme');
  });
});
