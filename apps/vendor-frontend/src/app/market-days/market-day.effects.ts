import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { MarketDays } from './market-days';
import {
  LoadMarketDays,
  LoadMarketDaysFailure,
  LoadMarketDaysSuccess,
  SetMarketDayMenu,
  SetMarketDayMenuFailure,
  SetMarketDayMenuSuccess,
} from './market-day.state';

@Injectable()
export class MarketDayEffects {
  private readonly actions$ = inject(Actions);
  private readonly marketDays = inject(MarketDays);
  private readonly router = inject(Router);

  loadMarketDays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadMarketDays),
      switchMap(() =>
        this.marketDays.upcoming().pipe(
          map(days => LoadMarketDaysSuccess({ days })),
          catchError((error: HttpErrorResponse) => of(LoadMarketDaysFailure({ status: error.status }))),
        ),
      ),
    ),
  );

  setMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SetMarketDayMenu),
      switchMap(({ marketId, date, itemIds }) =>
        this.marketDays.setMenu(marketId, date, itemIds).pipe(
          map(() => SetMarketDayMenuSuccess({ marketId, date, itemIds })),
          catchError(() => of(SetMarketDayMenuFailure())),
        ),
      ),
    ),
  );

  navigateToDashboard$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SetMarketDayMenuSuccess),
        tap(() => {
          void this.router.navigate(['/dashboard']);
        }),
      ),
    { dispatch: false },
  );
}
