import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketDayFacade } from './market-day.facade';
import { ChangeItemAvailability, LoadMarketDays, marketDayFeature, SetMarketDayMenu } from './market-day.state';

@Injectable()
export class StoreMarketDayFacade implements MarketDayFacade {
  private readonly store = inject(Store);

  readonly days = this.store.selectSignal(marketDayFeature.selectDays);
  readonly loading = this.store.selectSignal(marketDayFeature.selectLoading);
  private readonly fresh = this.store.selectSignal(marketDayFeature.selectFresh);

  // Only a stale cache refetches: a re-GET after a save would overwrite the optimistic
  // patch with a projection that lags the response by 4–275ms. Emptiness is a real
  // answer here — a vendor can genuinely have no upcoming days — so the flag, not the
  // list length.
  load(): void {
    if (!this.fresh()) {
      this.store.dispatch(LoadMarketDays());
    }
  }

  setMenu(marketId: string, date: string, itemIds: string[]): void {
    this.store.dispatch(SetMarketDayMenu({ marketId, date, itemIds }));
  }

  markSoldOut(marketId: string, date: string, itemId: string): void {
    this.store.dispatch(ChangeItemAvailability({ marketId, date, itemId, soldOut: true }));
  }

  markAvailable(marketId: string, date: string, itemId: string): void {
    this.store.dispatch(ChangeItemAvailability({ marketId, date, itemId, soldOut: false }));
  }
}
