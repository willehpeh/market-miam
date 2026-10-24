import { Query } from '@nestjs/cqrs';
import { VendorLegalIdentityView } from './vendor-legal-identity-view';

export class FindVendorLegalIdentity extends Query<VendorLegalIdentityView | undefined> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
