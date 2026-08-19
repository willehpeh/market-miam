import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { Store } from '@ngrx/store';
import { MarketDays } from './market-days';
import { hasLiveScreen } from './live-status';
import {
  ChangeItemAvailability,
  ChangeItemAvailabilityFailure,
  ChangeItemAvailabilitySuccess,
  ChangeStandClosure,
  ChangeStandClosureFailure,
  ChangeStandClosureSuccess,
  LoadMarketDay,
  LoadMarketDayFailure,
  LoadMarketDaySuccess,
  LoadMarketDays,
  LoadMarketDaysFailure,
  LoadMarketDaysSuccess,
  SetMarketDayMenu,
  SetMarketDayMenuFailure,
  SetMarketDayMenuSuccess,
  marketDayFeature,
} from './market-day.state';

@Injectable()
export class MarketDayEffects {
  private readonly actions$ = inject(Actions);
  private readonly marketDays = inject(MarketDays);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

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

  // switchMap: one screen reads one day, and a re-ask supersedes the one before it.
  loadMarketDay$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadMarketDay),
      switchMap(({ marketId, date }) =>
        this.marketDays.day(marketId, date).pipe(
          map(day => LoadMarketDaySuccess({ day })),
          catchError(() => of(LoadMarketDayFailure())),
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

  // concatMap, deliberately (live-mode decision 22): the switchMap above cancels the
  // in-flight request when the next arrives — right for one whole-set save per screen,
  // silently fatal for rapid taps. Queued, each request completes before the next loads
  // the aggregate, so a single client cannot 409 itself.
  changeAvailability$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChangeItemAvailability),
      concatMap(({ marketId, date, itemId, soldOut }) =>
        this.marketDays.changeAvailability(marketId, date, itemId, soldOut).pipe(
          map(() => ChangeItemAvailabilitySuccess()),
          catchError(() => of(ChangeItemAvailabilityFailure({ marketId, date, itemId, soldOut }))),
        ),
      ),
    ),
  );

  // Queued like the availability pair, and for the same reason: close then reopen must
  // not race, or the day settles on whichever response happens to land last.
  changeClosure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChangeStandClosure),
      concatMap(({ marketId, date, closed }) =>
        this.marketDays.changeClosure(marketId, date, closed).pipe(
          map(() => ChangeStandClosureSuccess()),
          catchError(() => of(ChangeStandClosureFailure({ marketId, date, closed }))),
        ),
      ),
    ),
  );

  // Back to the day, not to the dashboard: the card's own gate decides, so a menu saved
  // for today lands on the live screen and everything else lands where it always did. The
  // days are read after the patch above — reducers run before effects.
  navigateAfterSave$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SetMarketDayMenuSuccess),
        withLatestFrom(this.store.select(marketDayFeature.selectDays)),
        tap(([{ marketId, date }, days]) => {
          const saved = days.find(day => day.marketId === marketId && day.date === date);
          void this.router.navigate(hasLiveScreen(saved) ? ['/dashboard/live', marketId, date] : ['/dashboard']);
        }),
      ),
    { dispatch: false },
  );
}
