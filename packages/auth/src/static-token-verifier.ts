import { TokenVerifier } from './token-verifier';
import type { VerifiedVendor } from './verified-vendor';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';
import { ConfigService } from '@nestjs/config';

export class StaticTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  static forDevelopment(config: ConfigService): StaticTokenVerifier {
    return new StaticTokenVerifier({
      vendorId: new VendorId(config.get<string>('DEV_VENDOR_ID') ?? 'dev-vendor'),
      email: new Email(config.get<string>('DEV_VENDOR_EMAIL') ?? 'dev@local.test')
    });
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}
