import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MarketDays } from './market-days';
import { HttpMarketDays } from './http.market-days';
import { marketDayFeature } from './market-day.state';
import { MarketDayEffects } from './market-day.effects';
import { MarketDayFacade } from './market-day.facade';
import { StoreMarketDayFacade } from './store.market-day.facade';

export function provideMarketDays(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MarketDays, useClass: HttpMarketDays },
    provideState(marketDayFeature),
    provideEffects(MarketDayEffects),
    { provide: MarketDayFacade, useClass: StoreMarketDayFacade },
  ]);
}
