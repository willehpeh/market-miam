import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { LoginSuccess } from '../core/auth/auth.state';
import { Errors } from '../core/errors/errors';
import { Vendor } from './vendor';
import { RegisterVendor, RegisterVendorFailure, RegisterVendorSuccess } from './vendor.state';

@Injectable()
export class VendorEffects {
  private readonly actions$ = inject(Actions);
  private readonly vendor = inject(Vendor);
  private readonly errors = inject(Errors);

  registerOnLoginSuccess$ = createEffect(() => this.actions$.pipe(
    ofType(LoginSuccess),
    map(() => RegisterVendor()),
  ));

  registerVendor$ = createEffect(() => this.actions$.pipe(
    ofType(RegisterVendor),
    switchMap(() => this.vendor.register().pipe(
      map(() => RegisterVendorSuccess()),
      catchError(() => of(RegisterVendorFailure())),
    )),
  ));

  raiseErrorOnRegistrationFail$ = createEffect(() => this.actions$.pipe(
    ofType(RegisterVendorFailure),
    tap(() => this.errors.raise(new Error('Registration failed'))),
  ), { dispatch: false });
}
