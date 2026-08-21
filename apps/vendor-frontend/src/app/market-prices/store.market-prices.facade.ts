import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketPricesFacade } from './market-prices.facade';
import { PriceList } from './market-prices';
import { LoadMarketPrices, marketPricesFeature, SetMarketPrices } from './market-prices.state';

@Injectable()
export class StoreMarketPricesFacade implements MarketPricesFacade {
  private readonly store = inject(Store);

  readonly markets = this.store.selectSignal(marketPricesFeature.selectMarkets);
  readonly loading = this.store.selectSignal(marketPricesFeature.selectLoading);
  private readonly fresh = this.store.selectSignal(marketPricesFeature.selectFresh);

  // Only a stale cache refetches, as the catalogue does: a re-GET after a save would put
  // a projection that lags the response back over the patch that is already right.
  load(): void {
    if (!this.fresh()) {
      this.store.dispatch(LoadMarketPrices());
    }
  }

  setPrices(marketId: string, prices: PriceList): void {
    this.store.dispatch(SetMarketPrices({ marketId, prices }));
  }
}
