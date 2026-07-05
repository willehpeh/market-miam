import { TokenVerifier } from './token-verifier';
import type { VerifiedVendor } from './verified-vendor';

/**
 * A verifier that trusts a preset vendor regardless of the token. Used for the
 * dev runtime (fake auth, scoped to a configured vendor) and as a test double.
 * Never wire this in production — real requests must go through a verifier that
 * validates the credential (e.g. {@link Auth0TokenVerifier}).
 */
export class StaticTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}
