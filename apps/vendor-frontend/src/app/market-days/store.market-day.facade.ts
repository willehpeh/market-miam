import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketDayFacade } from './market-day.facade';
import { LoadMarketDays, marketDayFeature, SetMarketDayMenu } from './market-day.state';

@Injectable()
export class StoreMarketDayFacade implements MarketDayFacade {
  private readonly store = inject(Store);

  readonly days = this.store.selectSignal(marketDayFeature.selectDays);
  readonly loading = this.store.selectSignal(marketDayFeature.selectLoading);
  private readonly loaded = this.store.selectSignal(marketDayFeature.selectLoaded);

  // Warm-only: a re-GET after a save would overwrite the optimistic patch with a
  // projection that lags the response by 4–275ms. Emptiness is a real answer here — a
  // vendor can genuinely have no upcoming days — so the flag, not the list length.
  // Schedule changes drop the flag (see the reducer): those redraw which days exist,
  // which no patch can express, so the next visit asks again.
  load(): void {
    if (!this.loaded()) {
      this.store.dispatch(LoadMarketDays());
    }
  }

  setMenu(marketId: string, date: string, itemIds: string[]): void {
    this.store.dispatch(SetMarketDayMenu({ marketId, date, itemIds }));
  }
}
