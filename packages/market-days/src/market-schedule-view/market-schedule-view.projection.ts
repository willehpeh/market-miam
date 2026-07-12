import { MarketScheduleViewStore } from './market-schedule-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { MarketScheduleRegistered } from '../calendar/events';

@CheckpointedProjection('market-schedule-view')
export class MarketScheduleViewProjection extends ProjectionFor<MarketScheduleRegistered> {

  constructor(private readonly store: MarketScheduleViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<MarketScheduleRegistered> {
    return {
      MarketScheduleRegistered: e => this.handleRegistered(e)
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
}
