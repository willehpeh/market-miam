import { MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

export class InMemoryMarketDayViews implements MarketDayViews, MarketDayViewStore {
  private readonly menus = new Map<string, Map<string, MarketDayView>>();

  // Copied both ways: the store must not share array identity with writers or readers,
  // or a caller mutating its menu would silently mutate the store.
  async setMenu(menu: MarketDayView, vendorId: string): Promise<void> {
    const forVendor = this.menus.get(vendorId) ?? new Map<string, MarketDayView>();
    forVendor.set(`${menu.marketId}|${menu.date}`, this.copyOf(menu));
    this.menus.set(vendorId, forVendor);
  }

  async clear(): Promise<void> {
    this.menus.clear();
  }

  async menusFor(vendorId: string, from: string, to: string): Promise<MarketDayView[]> {
    return [...this.menus.get(vendorId)?.values() ?? []]
      .filter(menu => from <= menu.date && menu.date <= to)
      .map(menu => this.copyOf(menu))
      .sort((a, b) => a.date.localeCompare(b.date) || a.marketId.localeCompare(b.marketId));
  }

  private copyOf(menu: MarketDayView): MarketDayView {
    return { ...menu, itemIds: [...menu.itemIds] };
  }
}
