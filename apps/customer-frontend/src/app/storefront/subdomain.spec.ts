import { describe, expect, it } from 'vitest';
import { subdomainFrom } from './subdomain';

describe('subdomainFrom', () => {
  it('takes the first label of the host', () => {
    expect(subdomainFrom('acme.marketmiam.fr', null)).toBe('acme');
  });

  it('falls back to the query param when the host has no subdomain (localhost)', () => {
    expect(subdomainFrom('localhost:4200', 'bistro')).toBe('bistro');
  });

  it('is null when neither host nor query yields a subdomain', () => {
    expect(subdomainFrom('localhost', null)).toBeNull();
  });

  it('uses the query param when there is no host (browser navigation)', () => {
    expect(subdomainFrom(null, 'bistro')).toBe('bistro');
  });
});
