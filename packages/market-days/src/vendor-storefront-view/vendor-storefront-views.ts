import { VendorStorefrontView } from './vendor-storefront-view';

export abstract class VendorStorefrontViews {
  abstract findOrCreateForVendor(vendorId: string): Promise<VendorStorefrontView>;
}
