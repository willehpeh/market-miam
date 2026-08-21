import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MarketPrices } from './market-prices';
import {
  LoadMarketPrices,
  LoadMarketPricesFailure,
  LoadMarketPricesSuccess,
  SetMarketPrices,
  SetMarketPricesFailure,
  SetMarketPricesSuccess,
} from './market-prices.state';

@Injectable()
export class MarketPricesEffects {
  private readonly actions$ = inject(Actions);
  private readonly prices = inject(MarketPrices);

  loadMarketPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadMarketPrices),
      switchMap(() =>
        this.prices.list().pipe(
          map(({ markets }) => LoadMarketPricesSuccess({ markets })),
          catchError(() => of(LoadMarketPricesFailure())),
        ),
      ),
    ),
  );

  setMarketPrices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SetMarketPrices),
      switchMap(({ marketId, prices }) =>
        this.prices.set(marketId, prices).pipe(
          map(() => SetMarketPricesSuccess({ marketId, prices })),
          catchError(() => of(SetMarketPricesFailure())),
        ),
      ),
    ),
  );
}
