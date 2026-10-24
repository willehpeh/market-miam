import { VendorLegalIdentityView } from './vendor-legal-identity-view';

export abstract class VendorLegalIdentityViews {
  abstract findByVendor(vendorId: string): Promise<VendorLegalIdentityView | undefined>;
}
