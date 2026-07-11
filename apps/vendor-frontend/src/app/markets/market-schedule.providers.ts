import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MarketSchedules } from './market-schedules';
import { HttpMarketSchedules } from './http.market-schedules';
import { marketScheduleFeature } from './market-schedule.state';
import { MarketScheduleEffects } from './market-schedule.effects';
import { MarketScheduleFacade } from './market-schedule.facade';
import { StoreMarketScheduleFacade } from './store.market-schedule.facade';

export function provideMarketSchedules(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MarketSchedules, useClass: HttpMarketSchedules },
    provideState(marketScheduleFeature),
    provideEffects(MarketScheduleEffects),
    { provide: MarketScheduleFacade, useClass: StoreMarketScheduleFacade },
  ]);
}
