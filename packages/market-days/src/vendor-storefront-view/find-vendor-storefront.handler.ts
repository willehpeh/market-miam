import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindVendorStorefront } from './find-vendor-storefront';
import { VendorStorefrontView } from './vendor-storefront-view';
import { VendorStorefrontViews } from './vendor-storefront-views';

@QueryHandler(FindVendorStorefront)
export class FindVendorStorefrontHandler implements IQueryHandler<FindVendorStorefront> {
  constructor(private readonly views: VendorStorefrontViews) {}

  execute(query: FindVendorStorefront): Promise<VendorStorefrontView | undefined> {
    return this.views.findByVendor(query.vendorId);
  }
}
