import { TokenVerifier } from './token-verifier';
import type { VerifiedVendor } from './verified-vendor';

export class StaticTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}
