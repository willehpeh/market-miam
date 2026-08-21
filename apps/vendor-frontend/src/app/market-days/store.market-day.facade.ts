import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MarketDayFacade } from './market-day.facade';
import { ItemOutcome } from './market-days';
import {
  ChangeItemAvailability,
  ChangeStandClosure,
  LoadMarketDay,
  LoadMarketDays,
  LoadUnratedMarketDays,
  marketDayFeature,
  RecordBilan,
  SetMarketDayMenu,
} from './market-day.state';

@Injectable()
export class StoreMarketDayFacade implements MarketDayFacade {
  private readonly store = inject(Store);

  readonly days = this.store.selectSignal(marketDayFeature.selectDays);
  readonly loading = this.store.selectSignal(marketDayFeature.selectLoading);
  readonly day = this.store.selectSignal(marketDayFeature.selectDay);
  readonly unrated = this.store.selectSignal(marketDayFeature.selectUnrated);
  readonly unratedLoading = this.store.selectSignal(marketDayFeature.selectUnratedLoading);
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

  // Never gated on freshness, unlike the list: the slot holds one day that the clock moves
  // under the vendor, and the screen asks for it again precisely when it has turned over.
  loadDay(marketId: string, date: string): void {
    this.store.dispatch(LoadMarketDay({ marketId, date }));
  }

  // Ungated, unlike the list: only the dashboard asks, and what it answers changes every
  // time the vendor finishes a bilan.
  loadUnrated(): void {
    this.store.dispatch(LoadUnratedMarketDays());
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

  close(marketId: string, date: string): void {
    this.store.dispatch(ChangeStandClosure({ marketId, date, closed: true }));
  }

  reopen(marketId: string, date: string): void {
    this.store.dispatch(ChangeStandClosure({ marketId, date, closed: false }));
  }

  recordBilan(marketId: string, date: string, outcomes: Record<string, ItemOutcome>): void {
    this.store.dispatch(RecordBilan({ marketId, date, outcomes }));
  }
}
