import {
  AmendMarketSchedule,
  AmendMarketScheduleHandler,
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
  let projection: MarketScheduleViewProjection;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryMarketScheduleViews();
    projection = new MarketScheduleViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('market-schedule-view'));
    calendars = new Calendars(new VendorScopedEvents(store));
  });

  it('returns no schedules when none are registered', async () => {
    await subscription.poll();

    expect(await views.forVendor('vendor-id')).toEqual({ schedules: [] });
  });

  it('projects a registered schedule, hoisting the market id out of the market', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);

    await subscription.poll();

    const { id, ...market } = command.market;
    expect(await views.forVendor(command.vendorId)).toEqual({
      schedules: [{
        scheduleId: command.scheduleId,
        marketId: id,
        market,
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

  it('amends the schedule while keeping declared absences', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);
    await new DeclareAbsenceHandler(calendars).execute(
      new DeclareAbsence({ vendorId: command.vendorId, scheduleId: command.scheduleId, from: '2023-09-16', to: '2023-09-30' }),
    );
    await new AmendMarketScheduleHandler(calendars).execute(
      new AmendMarketSchedule({
        vendorId: command.vendorId,
        scheduleId: command.scheduleId,
        startDate: command.startDate,
        market: command.market,
        days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }],
        frequency: command.frequency,
      }),
    );

    await subscription.poll();

    const { schedules } = await views.forVendor(command.vendorId);
    expect(schedules[0].days).toEqual([{ day: 'WED', startTime: '09:00', endTime: '13:00' }]);
    expect(schedules[0].absences).toEqual([{ from: '2023-09-16', to: '2023-09-30' }]);
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


  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    const command = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(command);
    await subscription.poll();
    expect((await views.forVendor(command.vendorId)).schedules).toHaveLength(1);

    await projection.reset();

    expect(await views.forVendor(command.vendorId)).toEqual({ schedules: [] });
  });
});
