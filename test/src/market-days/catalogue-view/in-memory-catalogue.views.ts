import { CatalogueView, CatalogueViewItem, CatalogueViews, CatalogueViewStore } from '@market-monster/market-days';

export class InMemoryCatalogueViews implements CatalogueViews, CatalogueViewStore {
  private readonly items = new Map<string, CatalogueViewItem[]>();

  async addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void> {
    const existing = (await this.forVendor(vendorId)).items;
    existing.push(item);
    this.items.set(vendorId, existing);
  }

  async updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    const newItems = vendorItems.map(vendorItem => vendorItem.itemId === itemId ? { ...vendorItem, price: newPrice } : vendorItem);
    this.items.set(vendorId, newItems);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async retireItem(itemId:string, vendorId:string): Promise<void> {
    const current = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, current.filter(item => item.itemId !== itemId));
  }

  async forVendor(vendorId: string): Promise<CatalogueView> {
    return { items: this.items.get(vendorId) ?? [] };
  }
}
