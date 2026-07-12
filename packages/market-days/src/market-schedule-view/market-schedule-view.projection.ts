import { MarketScheduleViewStore } from './market-schedule-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { AbsenceDeclared, CalendarEvent, MarketScheduleAmended, MarketScheduleCancelled, MarketScheduleRegistered } from '../calendar/events';

@CheckpointedProjection('market-schedule-view')
export class MarketScheduleViewProjection extends ProjectionFor<CalendarEvent> {

  constructor(private readonly store: MarketScheduleViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<CalendarEvent> {
    return {
      MarketScheduleRegistered: e => this.handleRegistered(e),
      MarketScheduleAmended: e => this.handleAmended(e),
      MarketScheduleCancelled: e => this.handleCancelled(e),
      AbsenceDeclared: e => this.handleAbsenceDeclared(e)
    };
  }

  private handleRegistered(event: StoredEvent): Promise<void> {
    const payload = event.payload as MarketScheduleRegistered['payload'];
    return this.store.recordSchedule({
      scheduleId: payload.scheduleId,
      market: payload.market,
      startDate: payload.startDate,
      days: payload.days,
      frequency: payload.frequency
    }, vendorIdFrom(event));
  }

  private handleAmended(event: StoredEvent): Promise<void> {
    const payload = event.payload as MarketScheduleAmended['payload'];
    return this.store.amendSchedule({
      scheduleId: payload.scheduleId,
      market: payload.market,
      startDate: payload.startDate,
      days: payload.days,
      frequency: payload.frequency
    }, vendorIdFrom(event));
  }

  private handleCancelled(event: StoredEvent): Promise<void> {
    const payload = event.payload as MarketScheduleCancelled['payload'];
    return this.store.cancelSchedule(payload.scheduleId, vendorIdFrom(event));
  }

  private handleAbsenceDeclared(event: StoredEvent): Promise<void> {
    const payload = event.payload as AbsenceDeclared['payload'];
    return this.store.recordAbsence(payload.scheduleId, vendorIdFrom(event), { from: payload.from, to: payload.to });
  }
}
