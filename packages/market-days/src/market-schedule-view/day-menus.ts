import { CatalogueViewItem } from '../catalogue-view/catalogue-view';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { ItemOutcome } from '../market-day/events';
import { MarketDayView } from '../market-day-view/market-day-view';
import { MarketDayViews } from '../market-day-view/market-day-views';
import { MarketPricesViews } from '../market-prices-view/market-prices-views';
import { priced } from '../market-prices-view/priced-items';

// What a market day's own row says, joined to the catalogue and to what this market
// charges. One home for the join every day-scoped read was doing for itself: the window
// query built it per range, the point lookup inline per date, and the two had already
// drifted once on the field beside these (decision 56).
export type DayMenu = {
  items: CatalogueViewItem[];
  soldOutItemIds: string[];
  outcomes: Record<string, ItemOutcome>;
  closed: boolean;
  closedAt?: string;
};

export type DayMenus = ReadonlyMap<string, DayMenu>;

// The three reads this join needs. Passed rather than held so the handlers keep owning
// their own dependencies — this is a function they call, not a collaborator they defer to.
export type DayMenuSources = {
  catalogues: CatalogueViews;
  menus: MarketDayViews;
  prices: MarketPricesViews;
};

// Keyed by market *and* date, because a vendor can stand at two markets on one date
// (decision 2) and the day's row is keyed that way too. Reading by date alone answers for
// whichever row came back first, which is what `menuFor` exists to make unsayable.
const dayKey = (marketId: string, date: string) => `${marketId}|${date}`;

// Menus, catalogue and prices are read once for the whole range, not once per occurrence:
// the window is one range scan and a point lookup is a range of one. The menu event carries
// a set of ids; catalogue order is the display order, and joining here means a revised name
// or price reaches days already planned.
export async function dayMenus(
  sources: DayMenuSources,
  vendorId: string,
  from: string,
  to: string,
): Promise<DayMenus> {
  const [{ items }, menus, marketPrices] = await Promise.all([
    sources.catalogues.forVendor(vendorId),
    sources.menus.menusFor(vendorId, from, to),
    sources.prices.forVendor(vendorId),
  ]);
  const pricesAt = new Map(marketPrices.map(market => [market.marketId, market.prices]));
  return new Map(menus.map((menu: MarketDayView) => [
    dayKey(menu.marketId, menu.date),
    {
      items: priced(items.filter(item => menu.itemIds.includes(item.itemId)), pricesAt.get(menu.marketId) ?? {}),
      soldOutItemIds: menu.soldOutItemIds,
      outcomes: menu.outcomes,
      closed: menu.closed,
      closedAt: menu.closedAt,
    },
  ]));
}

// Absent when the vendor planned nothing for that day at that market — which every caller
// reads as the empty menu, not as a missing answer.
export function menuFor(menus: DayMenus, marketId: string, date: string): DayMenu | undefined {
  return menus.get(dayKey(marketId, date));
}
