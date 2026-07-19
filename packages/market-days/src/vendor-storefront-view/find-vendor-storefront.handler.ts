import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindVendorStorefront, VendorStorefront } from './find-vendor-storefront';
import { VendorStorefrontViews } from './vendor-storefront-views';
import { SubdomainRegistry } from '../subdomain-registry';

@QueryHandler(FindVendorStorefront)
export class FindVendorStorefrontHandler implements IQueryHandler<FindVendorStorefront> {
  constructor(
    private readonly views: VendorStorefrontViews,
    private readonly subdomains: SubdomainRegistry,
  ) {}

  async execute(query: FindVendorStorefront): Promise<VendorStorefront | undefined> {
    const view = await this.views.findByVendor(query.vendorId);
    if (!view) return undefined;
    const subdomain = await this.subdomains.subdomainFor(query.vendorId);
    return { ...view, subdomain: subdomain ?? null };
  }
}
