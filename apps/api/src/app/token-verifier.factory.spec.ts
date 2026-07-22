import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { InvalidTokenError } from '@market-miam/auth';
import { tokenVerifierFor } from './token-verifier.factory';

describe('Token verifier selection', () => {
  it.each(['production', 'staging', 'test', 'Development', ''])(
    'refuses an unverified token when NODE_ENV is %j',
    async (nodeEnv) => {
      const verifier = tokenVerifierFor(
        new ConfigService({
          NODE_ENV: nodeEnv,
          AUTH0_ISSUER: 'https://tenant.test/',
          AUTH0_AUDIENCE: 'https://api.test',
        }),
      );

      await expect(verifier.verify('not-a-real-token')).rejects.toThrow(InvalidTokenError);
    },
  );

  it('resolves a plain development token to dev-vendor', async () => {
    const verifier = tokenVerifierFor(new ConfigService({ NODE_ENV: 'development' }));

    const vendor = await verifier.verify('dev');

    expect(vendor.vendorId.value()).toBe('dev-vendor');
  });

  it('lets a development token name the vendor to sign in as', async () => {
    const verifier = tokenVerifierFor(new ConfigService({ NODE_ENV: 'development' }));

    const vendor = await verifier.verify('dev:demo-vendor');

    expect(vendor.vendorId.value()).toBe('demo-vendor');
  });

  it('refuses a vendor-naming development token outside development', async () => {
    const verifier = tokenVerifierFor(
      new ConfigService({
        NODE_ENV: 'production',
        AUTH0_ISSUER: 'https://tenant.test/',
        AUTH0_AUDIENCE: 'https://api.test',
      }),
    );

    await expect(verifier.verify('dev:demo-vendor')).rejects.toThrow(InvalidTokenError);
  });
});
