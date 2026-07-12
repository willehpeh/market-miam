import { CatalogueViewItem } from './catalogue-view';

export abstract class CatalogueViewStore {
  abstract addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void>;
  abstract updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void>;
  abstract reviseItem(itemId: string, details: Pick<CatalogueViewItem, 'name' | 'description' | 'price'>, vendorId: string): Promise<void>;
  abstract updateItemPhoto(itemId: string, imageReference: string, vendorId: string): Promise<void>;
  abstract retireItem(itemId: string, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
