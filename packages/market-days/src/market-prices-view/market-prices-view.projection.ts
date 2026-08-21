import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { MarketPricesSet } from '../calendar/events';
import { MarketPricesViewStore } from './market-prices-view.store';

@CheckpointedProjection('market-prices-view')
export class MarketPricesViewProjection extends ProjectionFor<MarketPricesSet> {

  constructor(private readonly store: MarketPricesViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<MarketPricesSet> {
    return {
      MarketPricesSet: e => this.handlePricesSet(e),
    };
  }

  reset(): Promise<void> {
    return this.store.clear();
  }

  private handlePricesSet(event: StoredEvent<MarketPricesSet>): Promise<void> {
    const { marketId, prices } = event.payload;
    return this.store.setPrices({ marketId, prices }, vendorIdFrom(event));
  }
}
