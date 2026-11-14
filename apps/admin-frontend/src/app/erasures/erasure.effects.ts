import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap } from 'rxjs';
import { Erasures } from './erasures';
import { EraseVendor } from './erasure.state';

@Injectable()
export class ErasureEffects {
  private readonly actions$ = inject(Actions);
  private readonly erasures = inject(Erasures);

  erase$ = createEffect(
    () => this.actions$.pipe(ofType(EraseVendor), exhaustMap(({ vendorId }) => this.erasures.erase(vendorId))),
    { dispatch: false },
  );
}
