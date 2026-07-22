import { TokenVerifier } from './token-verifier';
import type { VerifiedVendor } from './verified-vendor';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';

// Dev-only stand-in for Auth0: the bearer token is `dev`, or `dev:<vendorId>` to
// sign in as a particular seeded vendor. Trusting the token's contents is the
// whole point and is safe only because this verifier is constructed solely when
// NODE_ENV=development (see tokenVerifierFor) — production always verifies real
// Auth0 signatures, which `dev:anything` fails.
export class DevelopmentTokenVerifier extends TokenVerifier {
  constructor(private readonly fallbackVendorId = 'dev-vendor') {
    super();
  }

  verify(bearerToken: string): Promise<VerifiedVendor> {
    const [, requested] = bearerToken.split(':');
    return Promise.resolve({
      vendorId: new VendorId(requested || this.fallbackVendorId),
      email: new Email('dev@local.test'),
    });
  }
}
