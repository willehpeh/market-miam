import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MarketPrices } from './market-prices';
import { HttpMarketPrices } from './http.market-prices';
import { marketPricesFeature } from './market-prices.state';
import { MarketPricesEffects } from './market-prices.effects';
import { MarketPricesFacade } from './market-prices.facade';
import { StoreMarketPricesFacade } from './store.market-prices.facade';

export function provideMarketPrices(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MarketPrices, useClass: HttpMarketPrices },
    provideState(marketPricesFeature),
    provideEffects(MarketPricesEffects),
    { provide: MarketPricesFacade, useClass: StoreMarketPricesFacade },
  ]);
}
