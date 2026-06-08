import { CatalogueView } from './catalogue-view';

export abstract class CatalogueViews {
  abstract forVendor(vendorId: string): Promise<CatalogueView>;
}
