import {
  Calendars,
  InMemoryMarketScheduleViews,
  MarketScheduleViewProjection,
  RegisterMarketScheduleHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';

describe('MarketScheduleView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryMarketScheduleViews;
  let calendars: Calendars;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryMarketScheduleViews();
    subscription = new PollingSubscription(store, new MarketScheduleViewProjection(views), new InMemoryCheckpoint('market-schedule-view'));
    calendars = new Calendars(new VendorScopedEvents(store));
  });

  it('returns no schedules when none are registered', async () => {
    await subscription.poll();

    expect(await views.forVendor('vendor-id')).toEqual({ schedules: [] });
  });

  it('projects a registered schedule as its snapshot', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);

    await subscription.poll();

    expect(await views.forVendor(command.vendorId)).toEqual({
      schedules: [{
        scheduleId: command.scheduleId,
        market: command.market,
        startDate: command.startDate,
        days: command.days,
        frequency: { weeks: 1 }
      }]
    });
  });

  it('replaces a re-registered schedule, keeping a single row', async () => {
    const handler = new RegisterMarketScheduleHandler(calendars);
    await handler.execute(TestRegisterMarketSchedule.simple());
    await handler.execute(TestRegisterMarketSchedule.with({ days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }] }));

    await subscription.poll();

    expect(await views.forVendor('vendor-id')).toEqual({
      schedules: [{
        scheduleId: 'schedule-id',
        market: TestRegisterMarketSchedule.simple().market,
        startDate: '2023-09-08',
        days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }],
        frequency: { weeks: 1 }
      }]
    });
  });
});
