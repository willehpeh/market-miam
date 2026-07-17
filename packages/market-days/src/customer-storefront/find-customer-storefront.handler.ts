import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindCustomerStorefront } from './find-customer-storefront';
import { CustomerStorefront } from './customer-storefront';
import { SubdomainRegistry } from '../subdomain-registry/subdomain-registry';
import { VendorStorefrontViews } from '../vendor-storefront-view/vendor-storefront-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';

@QueryHandler(FindCustomerStorefront)
export class FindCustomerStorefrontHandler implements IQueryHandler<FindCustomerStorefront> {
  constructor(
    private readonly registry: SubdomainRegistry,
    private readonly storefronts: VendorStorefrontViews,
    private readonly catalogues: CatalogueViews,
  ) {}

  async execute(query: FindCustomerStorefront): Promise<CustomerStorefront | undefined> {
    const vendorId = await this.registry.vendorFor(query.subdomain);
    if (!vendorId) return undefined;
    const view = await this.storefronts.findByVendor(vendorId);
    if (!view || !view.published) {
      return { status: 'coming-soon', name: view?.name || null };
    }
    const catalogue = await this.catalogues.forVendor(vendorId);
    return {
      status: 'published',
      name: view.name,
      description: view.description,
      phone: view.phone,
      coverPhoto: view.imageReference || null,
      dishes: catalogue.items,
    };
  }
}
