import { MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

export class InMemoryMarketDayViews implements MarketDayViews, MarketDayViewStore {
  private readonly menus = new Map<string, string[]>();

  async setMenu(menu: MarketDayView, vendorId: string): Promise<void> {
    this.menus.set(this.key(vendorId, menu.marketId, menu.date), menu.itemIds);
  }

  async clear(): Promise<void> {
    this.menus.clear();
  }

  async menuFor(vendorId: string, marketId: string, date: string): Promise<MarketDayView> {
    return { marketId, date, itemIds: this.menus.get(this.key(vendorId, marketId, date)) ?? [] };
  }

  private key(vendorId: string, marketId: string, date: string): string {
    return `${vendorId}|${marketId}|${date}`;
  }
}
