import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  AmendMarketSchedule,
  AmendMarketScheduleHandler,
  Calendars,
  ImmutableMarketError,
  NoSuchScheduleError,
  RegisterMarketScheduleHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';

describe('Amend Market Schedule', () => {
  let store: InMemoryEventStore;
  let calendars: Calendars;
  let handler: AmendMarketScheduleHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(new VendorScopedEvents(store));
    handler = new AmendMarketScheduleHandler(calendars);
  });

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
    const registered = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(registered);

    await handler.execute(amend({ days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }], frequency: { weeks: 2 } }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({
        type: 'MarketScheduleAmended',
        payload: expect.objectContaining({
          scheduleId: registered.scheduleId,
          market: registered.market,
          days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }],
          frequency: { weeks: 2 },
        }),
      }),
    ]);
  });

  it('rejects amending a schedule that was never registered', async () => {
    await new RegisterMarketScheduleHandler(calendars).execute(TestRegisterMarketSchedule.simple());

    await expect(handler.execute(amend({ scheduleId: 'never-registered' }))).rejects.toThrow(NoSuchScheduleError);
  });

  it('rejects repointing the schedule to a different market', async () => {
    const registered = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(registered);

    await expect(
      handler.execute(amend({ market: { ...registered.market, id: 'other-market' } })),
    ).rejects.toThrow(ImmutableMarketError);
  });
});
