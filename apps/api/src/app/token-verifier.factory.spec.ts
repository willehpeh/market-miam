import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Auth0TokenVerifier, StaticTokenVerifier } from '@market-miam/auth';
import { tokenVerifierFor } from './token-verifier.factory';

const configWith = (values: Record<string, string | undefined>): ConfigService =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing config: ${key}`);
      return value;
    },
  }) as unknown as ConfigService;

describe('Token verifier selection', () => {
  it('fakes auth to the configured dev vendor in development', async () => {
    const verifier = tokenVerifierFor(
      configWith({ NODE_ENV: 'development', DEV_VENDOR_ID: 'acme-bakery' }),
    );

    expect(verifier).toBeInstanceOf(StaticTokenVerifier);
    const vendor = await verifier.verify('any-token-ignored');
    expect(vendor.vendorId.value()).toBe('acme-bakery');
  });

  it('uses real Auth0 verification outside development', () => {
    const verifier = tokenVerifierFor(
      configWith({
        NODE_ENV: 'production',
        AUTH0_ISSUER: 'https://tenant.test/',
        AUTH0_AUDIENCE: 'https://api.test',
      }),
    );

    expect(verifier).toBeInstanceOf(Auth0TokenVerifier);
  });
});
