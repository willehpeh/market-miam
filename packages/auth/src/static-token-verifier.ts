import { TokenVerifier } from './token-verifier';
import type { VerifiedVendor } from './verified-vendor';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';

export class StaticTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  static forDevelopment(): StaticTokenVerifier {
    return new StaticTokenVerifier({
      vendorId: new VendorId('dev-vendor'),
      email: new Email('dev@local.test')
    });
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}
