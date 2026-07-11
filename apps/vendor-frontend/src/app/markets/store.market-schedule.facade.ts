import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketScheduleFacade } from './market-schedule.facade';
import { NewSchedule } from './market-schedules';
import { LoadMarketSchedules, marketScheduleFeature } from './market-schedule.state';

@Injectable()
export class StoreMarketScheduleFacade implements MarketScheduleFacade {
  private readonly store = inject(Store);

  readonly schedules = this.store.selectSignal(marketScheduleFeature.selectSchedules);
  readonly loading = this.store.selectSignal(marketScheduleFeature.selectLoading);

  load(): void {
    this.store.dispatch(LoadMarketSchedules());
  }

  registerSchedule(_schedule: NewSchedule): void {
    // ponytail: minting + dispatch land in step 2, driven by the store spec.
    throw new Error('registerSchedule: not implemented (step 2)');
  }
}
