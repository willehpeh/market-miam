import { Query } from '@nestjs/cqrs';
import { VendorStorefrontView } from './vendor-storefront-view';

export type VendorStorefront = VendorStorefrontView & { subdomain: string | null };

export class FindVendorStorefront extends Query<VendorStorefront | undefined> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
