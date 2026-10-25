import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  AmendMarketSchedule,
  AmendMarketScheduleHandler,
  Calendars,
  ImmutableMarketError,
  NoSuchScheduleError,
  VendorScopedEvents
} from '@market-miam/market-days';
import { calendarStream, scheduleRegistered } from '../calendar-events';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';

describe('Amend Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: AmendMarketScheduleHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new AmendMarketScheduleHandler(new Calendars(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(calendarStream('vendor-id'), history, { vendorId: 'vendor-id' });

  function amend(overrides: Partial<AmendMarketSchedule>): AmendMarketSchedule {
    const base = TestRegisterMarketSchedule.simple();
    return new AmendMarketSchedule({
      vendorId: base.vendorId,
      scheduleId: base.scheduleId,
      startDate: base.startDate,
      market: base.market,
      days: base.days,
      frequency: base.frequency,
      ...overrides,
    });
  }

  it('amends a registered schedule', async () => {
    const registered = scheduleRegistered();
    given(registered);

    await handler.execute(amend({ days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }], frequency: { weeks: 2 } }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleAmended',
        payload: expect.objectContaining({
          scheduleId: registered.payload.scheduleId,
          market: registered.payload.market,
          days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }],
          frequency: { weeks: 2 },
        }),
      }),
    ]);
  });

  // A market registered without a street address or a pitch, amended without a frequency:
  // every optional field stays optional on the way through, and the cadence defaults to weekly.
  it('amends a schedule whose market has no street address or pitch, keeping it weekly', async () => {
    const bare = { id: 'market-id', name: 'Belleville Market', codePostal: '75020', town: 'Paris' };
    given(scheduleRegistered({ market: bare }));

    await handler.execute(amend({ market: bare, days: [{ day: 'SUN' }], frequency: undefined }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleAmended',
        payload: expect.objectContaining({ market: bare, days: [{ day: 'SUN' }], frequency: { weeks: 1 } }),
      }),
    ]);
  });

  it('rejects amending a schedule that was never registered', async () => {
    given(scheduleRegistered());

    await expect(handler.execute(amend({ scheduleId: 'never-registered' }))).rejects.toThrow(NoSuchScheduleError);
  });

  it('rejects repointing the schedule to a different market', async () => {
    const registered = scheduleRegistered();
    given(registered);

    await expect(
      handler.execute(amend({ market: { ...registered.payload.market, id: 'other-market' } })),
    ).rejects.toThrow(ImmutableMarketError);
  });
});
