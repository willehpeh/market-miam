import { CatalogueView, CatalogueViewItem } from './catalogue-view';
import { CatalogueViews } from './catalogue-views';
import { CatalogueViewStore } from './catalogue-view.store';

export class InMemoryCatalogueViews implements CatalogueViews, CatalogueViewStore {
  private readonly items = new Map<string, CatalogueViewItem[]>();

  async addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void> {
    const existing = (await this.forVendor(vendorId)).items;
    // Replace in place rather than append: a rebuild replays every ItemAddedToCatalogue,
    // and an unconditional push would duplicate each item. Mirrors the postgres adapter's
    // ON CONFLICT DO UPDATE, which is what the shared contract pins.
    const index = existing.findIndex(candidate => candidate.itemId === item.itemId);
    if (index === -1) {
      existing.push(item);
    } else {
      existing[index] = item;
    }
    this.items.set(vendorId, existing);
  }

  async reviseItem(itemId: string, details: Pick<CatalogueViewItem, 'name' | 'description' | 'price' | 'variants'>, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, vendorItems.map(item => item.itemId === itemId
      ? { ...item, name: details.name, description: details.description, price: details.price, variants: details.variants }
      : item));
  }

  async updateItemPhoto(itemId: string, imageReference: string, vendorId: string): Promise<void> {
    const vendorItems = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, vendorItems.map(item => item.itemId === itemId ? { ...item, imageReference } : item));
  }

  // ItemsReordered always names every item in the catalogue — the aggregate refuses
  // anything less — so seating them by the given ids loses nothing. Written as a filter
  // rather than a lookup with a fallback: a `?? []` for the miss would silently drop an
  // item on the day that guarantee broke, and no test can reach it to say otherwise.
  async reorderItems(itemIds: string[], vendorId: string): Promise<void> {
    const items = (await this.forVendor(vendorId)).items;
    this.items.set(vendorId, itemIds.flatMap(itemId => items.filter(item => item.itemId === itemId)));
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
