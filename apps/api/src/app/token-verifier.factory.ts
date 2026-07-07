import { ConfigService } from '@nestjs/config';
import { Auth0TokenVerifier, StaticTokenVerifier, TokenVerifier } from '@market-miam/auth';
import { Email } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';

/**
 * Chooses the token verifier for the running API. Development fakes auth to a
 * configured vendor so local requests need no real Auth0 token; every other
 * environment uses real Auth0 verification. Fail-safe: only the exact value
 * `development` activates the fake, and the production build sets `production`.
 */
export function tokenVerifierFor(config: ConfigService): TokenVerifier {
  if (config.get('NODE_ENV') === 'development') {
    return new StaticTokenVerifier({
      vendorId: new VendorId(config.get<string>('DEV_VENDOR_ID') ?? 'dev-vendor'),
      email: new Email(config.get<string>('DEV_VENDOR_EMAIL') ?? 'dev@local.test'),
    });
  }
  return new Auth0TokenVerifier(
    config.getOrThrow<string>('AUTH0_ISSUER'),
    config.getOrThrow<string>('AUTH0_AUDIENCE'),
  );
}
