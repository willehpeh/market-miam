import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SubdomainRegistry } from '../subdomain-registry';
import { FindVendorPublishingAt } from './find-vendor-publishing-at';
import { VendorStorefrontViews } from './vendor-storefront-views';

@QueryHandler(FindVendorPublishingAt)
export class FindVendorPublishingAtHandler implements IQueryHandler<FindVendorPublishingAt> {
  constructor(
    private readonly registry: SubdomainRegistry,
    private readonly storefronts: VendorStorefrontViews,
  ) {}

  async execute({ subdomain }: FindVendorPublishingAt): Promise<string | undefined> {
    const vendorId = await this.registry.vendorFor(subdomain);
    if (!vendorId) {
      return undefined;
    }
    return (await this.storefronts.findByVendor(vendorId))?.published ? vendorId : undefined;
  }
}
