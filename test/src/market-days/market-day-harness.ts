import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Catalogues,
  MarketDays,
  MarkItemAsAvailable,
  MarkItemAsAvailableHandler,
  MarkItemAsSoldOut,
  MarkItemAsSoldOutHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { clockAt } from '../clock-at';
import { seedCatalogue } from '../seed-catalogue';
import { TestSetMarketDayMenu, TODAY } from './set-market-day-menu/test-data';

// The rig every market-day write-side spec builds: vendor-1 with two catalogue items and
// the clock fixed on TODAY — clockAt's 09:00 UTC, so events stamp 11:00 on the Paris wall
// clock. Drive through the helpers (or the handlers directly); assert on store.newEvents().
export function marketDayHarness() {
  const store = new InMemoryEventStore();
  const events = new VendorScopedEvents(store);
  const clock = clockAt(TODAY);
  const marketDays = new MarketDays(events, clock);
  seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
  const catalogues = new Catalogues(events);
  const menus = new SetMarketDayMenuHandler(marketDays, catalogues);
  const soldOut = new MarkItemAsSoldOutHandler(marketDays, clock);
  const available = new MarkItemAsAvailableHandler(marketDays, clock);
  return {
    store,
    catalogues,
    menus,
    setMenu: (date: string, ...itemIds: string[]): Promise<void> =>
      menus.execute(TestSetMarketDayMenu.with({ date, itemIds })),
    markSoldOut: (date: string, itemId = 'item-1'): Promise<void> =>
      soldOut.execute(new MarkItemAsSoldOut('vendor-1', itemId, 'market-1', date)),
    markAvailable: (date: string, itemId = 'item-1'): Promise<void> =>
      available.execute(new MarkItemAsAvailable('vendor-1', itemId, 'market-1', date)),
  };
}
