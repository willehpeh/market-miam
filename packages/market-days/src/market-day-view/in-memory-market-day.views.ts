import { AvailabilityMark, MarketDayMenu, MarketDayRef, MarketDayView, OutcomeMark } from './market-day-view';
import { MarketDayViews } from './market-day-views';
import { MarketDayViewStore } from './market-day-view.store';

export class InMemoryMarketDayViews implements MarketDayViews, MarketDayViewStore {
  private readonly menus = new Map<string, Map<string, MarketDayView>>();

  // Copied both ways: the store must not share array identity with writers or readers,
  // or a caller mutating its menu would silently mutate the store.
  async setMenu(menu: MarketDayMenu, vendorId: string): Promise<void> {
    const forVendor = this.menus.get(vendorId) ?? new Map<string, MarketDayView>();
    const existing = forVendor.get(this.keyOf(menu));
    const soldOut = existing?.soldOutItemIds.filter(id => menu.itemIds.includes(id)) ?? [];
    const outcomes = Object.fromEntries(
      Object.entries(existing?.outcomes ?? {}).filter(([itemId]) => menu.itemIds.includes(itemId)),
    );
    forVendor.set(this.keyOf(menu), this.copyOf({ ...menu, soldOutItemIds: soldOut, outcomes, closed: existing?.closed ?? false }));
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

  async recordOutcome(mark: OutcomeMark, vendorId: string): Promise<void> {
    const day = this.menus.get(vendorId)?.get(this.keyOf(mark));
    if (day) {
      day.outcomes = { ...day.outcomes, [mark.itemId]: mark.outcome };
    }
  }

  // Upsert, unlike the availability marks: closing a day nobody planned is a real thing a
  // vendor does — the *je ne peux pas venir* door — so the row starts here, menu-less.
  async close(day: MarketDayRef, vendorId: string): Promise<void> {
    const forVendor = this.menus.get(vendorId) ?? new Map<string, MarketDayView>();
    const row = forVendor.get(this.keyOf(day))
      ?? { marketId: day.marketId, date: day.date, itemIds: [], soldOutItemIds: [], outcomes: {}, closed: false };
    forVendor.set(this.keyOf(day), { ...row, closed: true });
    this.menus.set(vendorId, forVendor);
  }

  async reopen(day: MarketDayRef, vendorId: string): Promise<void> {
    const row = this.menus.get(vendorId)?.get(this.keyOf(day));
    if (row) {
      row.closed = false;
      // Decision 30: the day kept going, so every judgment made about it is stale.
      row.outcomes = {};
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
    return { ...menu, itemIds: [...menu.itemIds], soldOutItemIds: [...menu.soldOutItemIds], outcomes: { ...menu.outcomes } };
  }
}
