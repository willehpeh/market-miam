import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import {
  ItemMarkedAsAvailable,
  ItemMarkedAsSoldOut,
  MarketDayBilanRecorded,
  MarketDayClosed,
  MarketDayMenuSet,
  MarketDayReopened
} from '../market-day/events';
import { MarketDayViewStore } from './market-day-view.store';

type MarketDayViewEvent =
  | MarketDayMenuSet
  | ItemMarkedAsSoldOut
  | ItemMarkedAsAvailable
  | MarketDayBilanRecorded
  | MarketDayClosed
  | MarketDayReopened;

@CheckpointedProjection('market-day-view')
export class MarketDayViewProjection extends ProjectionFor<MarketDayViewEvent> {

  constructor(private readonly store: MarketDayViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<MarketDayViewEvent> {
    return {
      MarketDayMenuSet: e => this.handleMenuSet(e),
      ItemMarkedAsSoldOut: e => this.store.markSoldOut(e.payload, vendorIdFrom(e)),
      ItemMarkedAsAvailable: e => this.store.markAvailable(e.payload, vendorIdFrom(e)),
      MarketDayBilanRecorded: e => this.store.recordBilan(e.payload, vendorIdFrom(e)),
      MarketDayClosed: e => this.store.close(e.payload, vendorIdFrom(e)),
      MarketDayReopened: e => this.store.reopen(e.payload, vendorIdFrom(e)),
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  // The event payload is the view: catalogue detail is joined at query time, so nothing
  // here needs reshaping.
  private handleMenuSet(event: StoredEvent<MarketDayMenuSet>): Promise<void> {
    return this.store.setMenu(event.payload, vendorIdFrom(event));
  }
}
