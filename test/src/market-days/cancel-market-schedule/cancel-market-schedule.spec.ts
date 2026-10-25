import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  CancelMarketSchedule,
  CancelMarketScheduleHandler,
  NoSuchScheduleError,
  VendorScopedEvents
} from '@market-miam/market-days';
import { calendarStream, scheduleCancelled, scheduleRegistered } from '../calendar-events';

describe('Cancel Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: CancelMarketScheduleHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new CancelMarketScheduleHandler(new Calendars(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(calendarStream('vendor-id'), history, { vendorId: 'vendor-id' });

  const cancel = (scheduleId = 'schedule-id'): CancelMarketSchedule =>
    new CancelMarketSchedule({ vendorId: 'vendor-id', scheduleId });

  it('cancels a registered schedule', async () => {
    given(scheduleRegistered());

    await handler.execute(cancel());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleCancelled',
        payload: { scheduleId: 'schedule-id' },
      }),
    ]);
  });

  it('rejects cancelling a schedule that was never registered', async () => {
    given(scheduleRegistered());

    await expect(handler.execute(cancel('never-registered'))).rejects.toThrow(NoSuchScheduleError);
  });

  it('rejects cancelling a schedule that is already cancelled', async () => {
    given(scheduleRegistered(), scheduleCancelled());

    await expect(handler.execute(cancel())).rejects.toThrow(NoSuchScheduleError);
  });
});
