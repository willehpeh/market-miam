import { CatalogueViewItem } from './catalogue-view';

export abstract class CatalogueViewStore {
  abstract addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void>;
  abstract updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
