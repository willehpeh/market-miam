import { Query } from '@nestjs/cqrs';
import { CatalogueView } from './catalogue-view';

export class FindVendorCatalogue extends Query<CatalogueView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
