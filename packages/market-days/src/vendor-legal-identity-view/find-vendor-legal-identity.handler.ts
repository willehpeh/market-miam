import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindVendorLegalIdentity } from './find-vendor-legal-identity';
import { VendorLegalIdentityView } from './vendor-legal-identity-view';
import { VendorLegalIdentityViews } from './vendor-legal-identity-views';

@QueryHandler(FindVendorLegalIdentity)
export class FindVendorLegalIdentityHandler implements IQueryHandler<FindVendorLegalIdentity> {
  constructor(private readonly views: VendorLegalIdentityViews) {}

  execute(query: FindVendorLegalIdentity): Promise<VendorLegalIdentityView | undefined> {
    return this.views.findByVendor(query.vendorId);
  }
}
