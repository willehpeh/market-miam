import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindVendorCatalogue } from './find-vendor-catalogue';
import { CatalogueView } from './catalogue-view';
import { CatalogueViews } from './catalogue-views';

@QueryHandler(FindVendorCatalogue)
export class FindVendorCatalogueHandler implements IQueryHandler<FindVendorCatalogue> {
  constructor(private readonly views: CatalogueViews) {}

  execute(query: FindVendorCatalogue): Promise<CatalogueView> {
    return this.views.forVendor(query.vendorId);
  }
}
