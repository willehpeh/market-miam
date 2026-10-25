import { InMemoryMarketScheduleViews, MarketScheduleViewProjection } from '@market-miam/market-days';
import { DomainEvent, InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';
import { absenceDeclared, calendarStream, scheduleAmended, scheduleCancelled, scheduleRegistered } from '../calendar-events';

describe('MarketScheduleView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryMarketScheduleViews;
  let projection: MarketScheduleViewProjection;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryMarketScheduleViews();
    projection = new MarketScheduleViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('market-schedule-view'));
  });

  // What vendor-id's calendar already holds.
  const given = (...history: DomainEvent[]): void =>
    store.seedWith(calendarStream('vendor-id'), history, { vendorId: 'vendor-id' });

  it('returns no schedules when none are registered', async () => {
    await subscription.poll();

    expect(await views.forVendor('vendor-id')).toEqual({ schedules: [] });
  });

  it('projects a registered schedule, hoisting the market id out of the market', async () => {
    const command = TestRegisterMarketSchedule.simple();
    given(scheduleRegistered());

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
    given(scheduleRegistered(), scheduleCancelled());

    await subscription.poll();

    expect(await views.forVendor(command.vendorId)).toEqual({ schedules: [] });
  });

  it('amends the schedule while keeping declared absences', async () => {
    const command = TestRegisterMarketSchedule.simple();
    given(
      scheduleRegistered(),
      absenceDeclared('2023-09-16', '2023-09-30'),
      scheduleAmended({ days: [{ day: 'WED', startTime: '09:00', endTime: '13:00' }] }),
    );

    await subscription.poll();

    const { schedules } = await views.forVendor(command.vendorId);
    expect(schedules[0].days).toEqual([{ day: 'WED', startTime: '09:00', endTime: '13:00' }]);
    expect(schedules[0].absences).toEqual([{ from: '2023-09-16', to: '2023-09-30' }]);
  });

  it('records a declared absence range on the schedule', async () => {
    const command = TestRegisterMarketSchedule.simple();
    given(scheduleRegistered(), absenceDeclared('2023-09-16', '2023-09-30'));

    await subscription.poll();

    expect((await views.forVendor(command.vendorId)).schedules[0].absences).toEqual([
      { from: '2023-09-16', to: '2023-09-30' },
    ]);
  });


  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    const command = TestRegisterMarketSchedule.simple();
    given(scheduleRegistered());
    await subscription.poll();
    expect((await views.forVendor(command.vendorId)).schedules).toHaveLength(1);

    await projection.reset();

    expect(await views.forVendor(command.vendorId)).toEqual({ schedules: [] });
  });
});
