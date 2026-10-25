import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
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
  RecordBilan,
  RecordBilanHandler,
  ReopenMarketDay,
  ReopenMarketDayHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import type { ItemOutcome, MarketScheduleAmended, MarketScheduleRegistered } from '@market-miam/market-days';
import { clockAt } from '../clock-at';
import { seedCatalogue } from '../seed-catalogue';
import { calendarStream, scheduleAmended, scheduleRegistered } from './calendar-events';
import { TestSetMarketDayMenu, TODAY } from './set-market-day-menu/test-data';

type MarketDayHours = { day: string; startTime?: string; endTime?: string };

const scheduleFor = (day: MarketDayHours) => ({
  scheduleId: 'schedule-1',
  startDate: '2026-06-01',
  market: { id: 'market-1', name: 'Marché', codePostal: '75011', town: 'Paris' },
  days: [day],
});

// The hours the aggregate decides with, as the calendar events a spec seeds with
// `givenCalendar`: market-1 registered (or amended) weekly from a start date early enough
// that every weekday in the specs' window recurs. Same schedule as `schedule` and
// `amendSchedule` below register through the commands.
export const scheduledOn = (day: MarketDayHours): MarketScheduleRegistered =>
  scheduleRegistered({ ...scheduleFor(day), frequency: { weeks: 1 } });

export const rescheduledTo = (day: MarketDayHours): MarketScheduleAmended =>
  scheduleAmended({ ...scheduleFor(day), frequency: { weeks: 1 } });

// The rig every market-day write-side spec builds: vendor-1 with two catalogue items and
// the clock fixed on TODAY — clockAt's 09:00 UTC, so events stamp 11:00 on the Paris wall
// clock. State a spec's Given with `given` and the builders in market-day-events.ts, so
// the slice presupposes events rather than other commands and store.newEvents() holds
// only what the command under test appended; the command helpers remain for the specs
// not yet written that way. Assert on store.newEvents().
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
  const bilans = new RecordBilanHandler(marketDays, clock);
  return {
    store,
    catalogues,
    menus,
    given: (date: string, ...history: DomainEvent[]): void =>
      store.seedWith(`market-day/vendor-1/market-1/${date}`, history, { vendorId: 'vendor-1' }),
    givenCalendar: (...history: DomainEvent[]): void =>
      store.seedWith(calendarStream('vendor-1'), history, { vendorId: 'vendor-1' }),
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
    recordBilan: (date: string, outcomes: Record<string, ItemOutcome>): Promise<void> =>
      bilans.execute(new RecordBilan('vendor-1', 'market-1', date, outcomes)),
    // The hours the aggregate decides with: registered for market-1, from a start date
    // early enough that every weekday in the specs' window recurs.
    schedule: (day: MarketDayHours): Promise<void> =>
      schedules.execute(new RegisterMarketSchedule({ vendorId: 'vendor-1', ...scheduleFor(day) })),
    amendSchedule: (day: MarketDayHours): Promise<void> =>
      amendments.execute(new AmendMarketSchedule({ vendorId: 'vendor-1', ...scheduleFor(day) })),
  };
}
