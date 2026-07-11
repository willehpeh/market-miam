import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MarketSchedules } from './market-schedules';
import { LoadMarketSchedules, LoadMarketSchedulesFailure, LoadMarketSchedulesSuccess } from './market-schedule.state';

@Injectable()
export class MarketScheduleEffects {
  private readonly actions$ = inject(Actions);
  private readonly marketSchedules = inject(MarketSchedules);

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
}
