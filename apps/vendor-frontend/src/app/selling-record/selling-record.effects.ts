import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { SellingRecord } from './selling-record';
import {
  LoadSellingRecord,
  LoadSellingRecordFailure,
  LoadSellingRecordSuccess,
} from './selling-record.state';

@Injectable()
export class SellingRecordEffects {
  private readonly actions$ = inject(Actions);
  private readonly record = inject(SellingRecord);

  loadSellingRecord$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadSellingRecord),
      switchMap(() =>
        this.record.list().pipe(
          map(({ markets }) => LoadSellingRecordSuccess({ markets })),
          catchError(() => of(LoadSellingRecordFailure())),
        ),
      ),
    ),
  );
}
