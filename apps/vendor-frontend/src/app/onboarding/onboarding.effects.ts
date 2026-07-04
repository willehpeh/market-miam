import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs';
import { RegisterVendor, RegisterVendorSuccess } from '../vendor/vendor.state';
import { LoadStorefront, LoadStorefrontSuccess } from '../storefront/storefront.state';
import { RetryOnboarding } from './onboarding.state';

@Injectable()
export class OnboardingEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);

  loadOnRegistered$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegisterVendorSuccess),
      map(() => LoadStorefront()),
    ),
  );

  retry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RetryOnboarding),
      map(() => RegisterVendor()),
    ),
  );

  navigateOnLoaded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(LoadStorefrontSuccess),
        tap(({ view }) => {
          const hasInfo = !!(view.name || view.description || view.imageReference);
          this.router.navigate(hasInfo ? ['/onboarding/storefront'] : ['/onboarding']);
        }),
      ),
    { dispatch: false },
  );
}
