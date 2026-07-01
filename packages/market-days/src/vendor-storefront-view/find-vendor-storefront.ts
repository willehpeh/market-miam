import { Query } from '@nestjs/cqrs';
import { VendorStorefrontView } from './vendor-storefront-view';

export class FindVendorStorefront extends Query<VendorStorefrontView | undefined> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
