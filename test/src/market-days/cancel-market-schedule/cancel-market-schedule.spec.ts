import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  CancelMarketSchedule,
  CancelMarketScheduleHandler,
  NoSuchScheduleError,
  RegisterMarketScheduleHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';

describe('Cancel Market Schedule', () => {
  let store: InMemoryEventStore;
  let calendars: Calendars;
  let handler: CancelMarketScheduleHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(new VendorScopedEvents(store));
    handler = new CancelMarketScheduleHandler(calendars);
  });

  it('cancels a registered schedule', async () => {
    const registered = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(registered);

    await handler.execute(new CancelMarketSchedule({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({
        type: 'MarketScheduleCancelled',
        payload: { scheduleId: registered.scheduleId },
      }),
    ]);
  });

  it('rejects cancelling a schedule that was never registered', async () => {
    const registered = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(registered);

    await expect(handler.execute(new CancelMarketSchedule({
      vendorId: registered.vendorId,
      scheduleId: 'never-registered',
    }))).rejects.toThrow(NoSuchScheduleError);
  });
});
