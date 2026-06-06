import { RepertoireView, RepertoireViewItem, RepertoireViews, RepertoireViewStore } from '@market-monster/market-days';

export class InMemoryRepertoireViews implements RepertoireViews, RepertoireViewStore {
  private readonly items = new Map<string, RepertoireViewItem[]>();

  async addItemToRepertoire(item: RepertoireViewItem, vendorId: string): Promise<void> {
    const existing = this.items.get(vendorId) ?? [];
    existing.push(item);
    this.items.set(vendorId, existing);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }

  async forVendor(vendorId: string): Promise<RepertoireView> {
    return { items: this.items.get(vendorId) ?? [] };
  }
}
