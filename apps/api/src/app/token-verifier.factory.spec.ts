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
});
