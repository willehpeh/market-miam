import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { MarketDayMenuSet } from '../market-day/events';
import { MarketDayViewStore } from './market-day-view.store';

@CheckpointedProjection('market-day-view')
export class MarketDayViewProjection extends ProjectionFor<MarketDayMenuSet> {

  constructor(private readonly store: MarketDayViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<MarketDayMenuSet> {
    return {
      MarketDayMenuSet: e => this.handleMenuSet(e),
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  // The event payload is the view: catalogue detail is joined at query time, so nothing
  // here needs reshaping.
  private handleMenuSet(event: StoredEvent): Promise<void> {
    return this.store.setMenu(event.payload as MarketDayMenuSet['payload'], vendorIdFrom(event));
  }
}
