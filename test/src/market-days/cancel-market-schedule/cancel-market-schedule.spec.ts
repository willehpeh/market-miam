import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  CancelMarketSchedule,
  CancelMarketScheduleHandler,
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
});
