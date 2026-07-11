import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketScheduleFacade } from './market-schedule.facade';
import { LoadMarketSchedules, marketScheduleFeature } from './market-schedule.state';

@Injectable()
export class StoreMarketScheduleFacade implements MarketScheduleFacade {
  private readonly store = inject(Store);

  readonly schedules = this.store.selectSignal(marketScheduleFeature.selectSchedules);
  readonly loading = this.store.selectSignal(marketScheduleFeature.selectLoading);

  load(): void {
    this.store.dispatch(LoadMarketSchedules());
  }
}
