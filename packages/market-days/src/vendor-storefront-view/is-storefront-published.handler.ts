import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsStorefrontPublished } from './is-storefront-published';
import { VendorStorefrontViews } from './vendor-storefront-views';

@QueryHandler(IsStorefrontPublished)
export class IsStorefrontPublishedHandler implements IQueryHandler<IsStorefrontPublished> {
  constructor(private readonly views: VendorStorefrontViews) {}

  async execute(query: IsStorefrontPublished): Promise<boolean> {
    return (await this.views.findByVendor(query.vendorId))?.published === true;
  }
}
