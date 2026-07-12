import { CatalogueView, CatalogueViewItem } from './catalogue-view';
import { CatalogueViews } from './catalogue-views';
import { CatalogueViewStore } from './catalogue-view.store';

export class InMemoryCatalogueViews implements CatalogueViews, CatalogueViewStore {
  private readonly items = new Map<string, CatalogueViewItem[]>();

  async addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void> {
    const existing = (await this.forVendor(vendorId)).items;
    existing.push(item);
    this.items.set(vendorId, existing);
  }

  async updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, vendorItems.map(item => item.itemId === itemId ? { ...item, price: newPrice } : item));
  }

  async reviseItem(itemId: string, details: Pick<CatalogueViewItem, 'name' | 'description' | 'price'>, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, vendorItems.map(item => item.itemId === itemId ? { ...item, ...details } : item));
  }

  async updateItemPhoto(itemId: string, imageReference: string, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, vendorItems.map(item => item.itemId === itemId ? { ...item, imageReference } : item));
  }

  async retireItem(itemId: string, vendorId: string): Promise<void> {
    const current = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, current.filter(item => item.itemId !== itemId));
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async forVendor(vendorId: string): Promise<CatalogueView> {
    return { items: this.items.get(vendorId) ?? [] };
  }
}
