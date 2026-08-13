import { AvailabilityMark, MarketDayMenu, MarketDayView } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

export class InMemoryMarketDayViews implements MarketDayViews, MarketDayViewStore {
  private readonly menus = new Map<string, Map<string, MarketDayView>>();

  // Copied both ways: the store must not share array identity with writers or readers,
  // or a caller mutating its menu would silently mutate the store.
  async setMenu(menu: MarketDayMenu, vendorId: string): Promise<void> {
    const forVendor = this.menus.get(vendorId) ?? new Map<string, MarketDayView>();
    const soldOut = forVendor.get(this.keyOf(menu))?.soldOutItemIds.filter(id => menu.itemIds.includes(id)) ?? [];
    forVendor.set(this.keyOf(menu), this.copyOf({ ...menu, soldOutItemIds: soldOut }));
    this.menus.set(vendorId, forVendor);
  }

  async markSoldOut(mark: AvailabilityMark, vendorId: string): Promise<void> {
    const day = this.menus.get(vendorId)?.get(this.keyOf(mark));
    if (day) {
      day.soldOutItemIds = [...day.soldOutItemIds, mark.itemId];
    }
  }

  async markAvailable(mark: AvailabilityMark, vendorId: string): Promise<void> {
    const day = this.menus.get(vendorId)?.get(this.keyOf(mark));
    if (day) {
      day.soldOutItemIds = day.soldOutItemIds.filter(itemId => itemId !== mark.itemId);
    }
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

  private keyOf(day: { marketId: string; date: string }): string {
    return `${day.marketId}|${day.date}`;
  }

  private copyOf(menu: MarketDayView): MarketDayView {
    return { ...menu, itemIds: [...menu.itemIds], soldOutItemIds: [...menu.soldOutItemIds] };
  }
}
