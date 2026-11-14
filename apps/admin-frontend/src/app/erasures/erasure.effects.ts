import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { Erasures } from './erasures';
import { EraseVendor, EraseVendorAccepted, EraseVendorFailed } from './erasure.state';

@Injectable()
export class ErasureEffects {
  private readonly actions$ = inject(Actions);
  private readonly erasures = inject(Erasures);

  // One erasure at a time: another asked for while one is in flight is ignored, as cancelling
  // a POST cannot take back what the api may have received.
  erase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EraseVendor),
      exhaustMap(({ vendorId }) =>
        this.erasures.erase(vendorId).pipe(
          map(() => EraseVendorAccepted({ vendorId })),
          catchError(() => of(EraseVendorFailed({ vendorId }))),
        ),
      ),
    ),
  );
}
