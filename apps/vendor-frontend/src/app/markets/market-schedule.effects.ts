import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { MarketSchedules } from './market-schedules';
import {
  AmendMarketSchedule,
  AmendMarketScheduleFailure,
  AmendMarketScheduleSuccess,
  LoadMarketSchedules,
  LoadMarketSchedulesFailure,
  LoadMarketSchedulesSuccess,
  RegisterMarketSchedule,
  RegisterMarketScheduleFailure,
  RegisterMarketScheduleSuccess,
} from './market-schedule.state';

@Injectable()
export class MarketScheduleEffects {
  private readonly actions$ = inject(Actions);
  private readonly marketSchedules = inject(MarketSchedules);
  private readonly router = inject(Router);

  loadMarketSchedules$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadMarketSchedules),
      switchMap(() =>
        this.marketSchedules.list().pipe(
          map(({ schedules }) => LoadMarketSchedulesSuccess({ schedules })),
          catchError((error: HttpErrorResponse) => of(LoadMarketSchedulesFailure({ status: error.status }))),
        ),
      ),
    ),
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegisterMarketSchedule),
      switchMap(({ schedule }) =>
        this.marketSchedules.register(schedule).pipe(
          map(() => RegisterMarketScheduleSuccess({ schedule })),
          catchError(() => of(RegisterMarketScheduleFailure())),
        ),
      ),
    ),
  );

  amend$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AmendMarketSchedule),
      switchMap(({ schedule }) =>
        this.marketSchedules.amend(schedule.scheduleId, schedule).pipe(
          map(() => AmendMarketScheduleSuccess({ schedule })),
          catchError(() => of(AmendMarketScheduleFailure())),
        ),
      ),
    ),
  );

  navigateToMarkets$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(RegisterMarketScheduleSuccess, AmendMarketScheduleSuccess),
        tap(() => {
          this.router.navigate(['/dashboard/markets']);
        }),
      ),
    { dispatch: false },
  );
}
