import { MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

export class InMemoryMarketDayViews implements MarketDayViews, MarketDayViewStore {
  private readonly menus = new Map<string, string[]>();

  // Copied both ways: the store must not share array identity with writers or readers,
  // or a caller mutating its menu would silently mutate the store.
  async setMenu(menu: MarketDayView, vendorId: string): Promise<void> {
    this.menus.set(this.key(vendorId, menu.marketId, menu.date), [...menu.itemIds]);
  }

  async clear(): Promise<void> {
    this.menus.clear();
  }

  async menuFor(vendorId: string, marketId: string, date: string): Promise<MarketDayView> {
    const itemIds = this.menus.get(this.key(vendorId, marketId, date)) ?? [];
    return { marketId, date, itemIds: [...itemIds] };
  }

  private key(vendorId: string, marketId: string, date: string): string {
    return `${vendorId}|${marketId}|${date}`;
  }
}
