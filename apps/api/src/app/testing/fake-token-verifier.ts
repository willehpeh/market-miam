import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';

// Test double: verifies any bearer token as the given vendor.
export class FakeTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}
