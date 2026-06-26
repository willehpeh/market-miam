import { VendorStorefrontView } from './vendor-storefront-view';

export abstract class VendorStorefrontViews {
  abstract findByVendor(vendorId: string): Promise<VendorStorefrontView | undefined>;
}
