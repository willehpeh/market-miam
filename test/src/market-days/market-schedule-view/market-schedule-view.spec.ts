import {
  Calendars,
  CancelMarketSchedule,
  CancelMarketScheduleHandler,
  DeclareAbsence,
  DeclareAbsenceHandler,
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

  it('removes a cancelled schedule from the view', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);
    await new CancelMarketScheduleHandler(calendars).execute(
      new CancelMarketSchedule({ vendorId: command.vendorId, scheduleId: command.scheduleId }),
    );

    await subscription.poll();

    expect(await views.forVendor(command.vendorId)).toEqual({ schedules: [] });
  });

  it('records a declared absence range on the schedule', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);
    await new DeclareAbsenceHandler(calendars).execute(
      new DeclareAbsence({ vendorId: command.vendorId, scheduleId: command.scheduleId, from: '2023-09-16', to: '2023-09-30' }),
    );

    await subscription.poll();

    expect((await views.forVendor(command.vendorId)).schedules[0].absences).toEqual([
      { from: '2023-09-16', to: '2023-09-30' },
    ]);
  });

});
