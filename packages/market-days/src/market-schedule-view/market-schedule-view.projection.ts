import { MarketScheduleViewStore } from './market-schedule-view.store';
import { MarketScheduleView } from './market-schedule-view';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { AbsenceDeclared, MarketScheduleAmended, MarketScheduleCancelled, MarketScheduleRegistered, ScheduleEvent } from '../calendar/events';

@CheckpointedProjection('market-schedule-view')
export class MarketScheduleViewProjection extends ProjectionFor<ScheduleEvent> {

  constructor(private readonly store: MarketScheduleViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<ScheduleEvent> {
    return {
      MarketScheduleRegistered: e => this.handleRegistered(e),
      MarketScheduleAmended: e => this.handleAmended(e),
      MarketScheduleCancelled: e => this.handleCancelled(e),
      AbsenceDeclared: e => this.handleAbsenceDeclared(e)
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  private handleRegistered(event: StoredEvent<MarketScheduleRegistered>): Promise<void> {
    return this.store.recordSchedule(this.viewOf(event.payload), vendorIdFrom(event));
  }

  private handleAmended(event: StoredEvent<MarketScheduleAmended>): Promise<void> {
    return this.store.amendSchedule(this.viewOf(event.payload), vendorIdFrom(event));
  }

  private viewOf(payload: MarketScheduleRegistered['payload'] | MarketScheduleAmended['payload']): MarketScheduleView {
    const { id, ...market } = payload.market;
    return {
      scheduleId: payload.scheduleId,
      marketId: id,
      market,
      startDate: payload.startDate,
      days: payload.days,
      frequency: payload.frequency
    };
  }

  private handleCancelled(event: StoredEvent<MarketScheduleCancelled>): Promise<void> {
    return this.store.cancelSchedule(event.payload.scheduleId, vendorIdFrom(event));
  }

  private handleAbsenceDeclared(event: StoredEvent<AbsenceDeclared>): Promise<void> {
    const { scheduleId, from, to } = event.payload;
    return this.store.recordAbsence(scheduleId, vendorIdFrom(event), { from, to });
  }
}
