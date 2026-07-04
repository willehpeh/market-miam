import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { LoginSuccess } from '../core/auth/auth.state';
import { Vendor } from './vendor';
import { RegisterVendor, RegisterVendorFailure, RegisterVendorSuccess } from './vendor.state';

@Injectable()
export class VendorEffects {
  private readonly actions$ = inject(Actions);
  private readonly vendor = inject(Vendor);

  registerOnLoginSuccess$ = createEffect(() => this.actions$.pipe(
    ofType(LoginSuccess),
    map(() => RegisterVendor()),
  ));

  registerVendor$ = createEffect(() => this.actions$.pipe(
    ofType(RegisterVendor),
    switchMap(() => this.vendor.register().pipe(
      map(() => RegisterVendorSuccess()),
      catchError((error: HttpErrorResponse) => of(RegisterVendorFailure({ status: error.status }))),
    )),
  ));
}
