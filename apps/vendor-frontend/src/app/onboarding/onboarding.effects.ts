import { inject, Injectable, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { delay, map, tap } from 'rxjs';
import { RegisterVendor, RegisterVendorSuccess } from '../vendor/vendor.state';
import {
  EditStorefrontSuccess,
  HideSavedModal,
  LoadStorefront,
  LoadStorefrontSuccess
} from '../storefront/storefront.state';
import { RetryOnboarding } from './onboarding.state';

// ponytail: how long the "Informations sauvegardées" confirmation shows before redirecting home.
export const SAVED_REDIRECT_DELAY = new InjectionToken<number>('onboarding.savedRedirectDelay', {
  factory: () => 1000,
});

@Injectable()
export class OnboardingEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);
  private readonly savedRedirectDelay = inject(SAVED_REDIRECT_DELAY);

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
          // A vendor who got as far as a photo has a dashboard worth landing on: the
          // steps card names what is left. Only someone who has done nothing at all
          // still needs the welcome.
          const destination = view.name || view.imageReference ? '/dashboard' : '/onboarding';
          void this.router.navigate([destination]);
        }),
      ),
    { dispatch: false },
  );

  navigateHomeOnSaved$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(EditStorefrontSuccess),
        delay(this.savedRedirectDelay),
        tap(() => {
          void this.router.navigate(['/dashboard']);
        }),
        map(() => HideSavedModal())
      ),
  );
}
