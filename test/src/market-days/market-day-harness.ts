import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  Catalogues,
  CloseMarketDay,
  CloseMarketDayHandler,
  MarketDays,
  MarkItemAsAvailable,
  MarkItemAsAvailableHandler,
  MarkItemAsSoldOut,
  MarkItemAsSoldOutHandler,
  AmendMarketSchedule,
  AmendMarketScheduleHandler,
  RegisterMarketSchedule,
  RegisterMarketScheduleHandler,
  ReopenMarketDay,
  ReopenMarketDayHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { clockAt } from '../clock-at';
import { seedCatalogue } from '../seed-catalogue';
import { TestSetMarketDayMenu, TODAY } from './set-market-day-menu/test-data';

const scheduleFor = (day: { day: string; startTime?: string; endTime?: string }) => ({
  vendorId: 'vendor-1',
  scheduleId: 'schedule-1',
  startDate: '2026-06-01',
  market: { id: 'market-1', name: 'Marché', codePostal: '75011', town: 'Paris' },
  days: [day],
});

// The rig every market-day write-side spec builds: vendor-1 with two catalogue items and
// the clock fixed on TODAY — clockAt's 09:00 UTC, so events stamp 11:00 on the Paris wall
// clock. Drive through the helpers (or the handlers directly); assert on store.newEvents().
export function marketDayHarness() {
  const store = new InMemoryEventStore();
  const events = new VendorScopedEvents(store);
  const clock = clockAt(TODAY);
  const calendars = new Calendars(events);
  const marketDays = new MarketDays(events, clock, calendars);
  seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
  const catalogues = new Catalogues(events);
  const menus = new SetMarketDayMenuHandler(marketDays, catalogues);
  const soldOut = new MarkItemAsSoldOutHandler(marketDays, clock);
  const available = new MarkItemAsAvailableHandler(marketDays, clock);
  const schedules = new RegisterMarketScheduleHandler(calendars);
  const amendments = new AmendMarketScheduleHandler(calendars);
  const closes = new CloseMarketDayHandler(marketDays, clock);
  const reopens = new ReopenMarketDayHandler(marketDays, clock);
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
    close: (date: string): Promise<void> =>
      closes.execute(new CloseMarketDay('vendor-1', 'market-1', date)),
    reopen: (date: string): Promise<void> =>
      reopens.execute(new ReopenMarketDay('vendor-1', 'market-1', date)),
    // The hours the aggregate decides with: registered for market-1, from a start date
    // early enough that every weekday in the specs' window recurs.
    schedule: (day: { day: string; startTime?: string; endTime?: string }): Promise<void> =>
      schedules.execute(new RegisterMarketSchedule({ ...scheduleFor(day) })),
    amendSchedule: (day: { day: string; startTime?: string; endTime?: string }): Promise<void> =>
      amendments.execute(new AmendMarketSchedule({ ...scheduleFor(day) })),
  };
}
