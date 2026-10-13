import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, delay, map, of, switchMap, tap } from 'rxjs';
import { LegalIdentity } from './legal-identity';
import { CompanyRegistry } from './company-registry';
import { SAVED_REDIRECT_DELAY } from '../onboarding/onboarding.effects';
import {
  HideLegalIdentitySaved,
  LoadLegalIdentity,
  LoadLegalIdentityFailure,
  LoadLegalIdentitySuccess,
  LookUpCompany,
  LookUpCompanyDone,
  ProvideLegalIdentity,
  ProvideLegalIdentityFailure,
  ProvideLegalIdentitySuccess,
} from './legal-identity.state';

@Injectable()
export class LegalIdentityEffects {
  private readonly actions$ = inject(Actions);
  private readonly legalIdentity = inject(LegalIdentity);
  private readonly registry = inject(CompanyRegistry);
  private readonly router = inject(Router);
  private readonly savedRedirectDelay = inject(SAVED_REDIRECT_DELAY);

  loadLegalIdentity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadLegalIdentity),
      switchMap(() =>
        this.legalIdentity.view().pipe(
          map((identity) => LoadLegalIdentitySuccess({ identity })),
          catchError((error: HttpErrorResponse) =>
            of(error.status === 404 ? LoadLegalIdentitySuccess({ identity: null }) : LoadLegalIdentityFailure()),
          ),
        ),
      ),
    ),
  );

  provideLegalIdentity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProvideLegalIdentity),
      switchMap(({ identity }) =>
        this.legalIdentity.provide(identity).pipe(
          map(() => ProvideLegalIdentitySuccess({ identity })),
          catchError(() => of(ProvideLegalIdentityFailure())),
        ),
      ),
    ),
  );

  navigateHomeOnProvided$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProvideLegalIdentitySuccess),
      delay(this.savedRedirectDelay),
      tap(() => {
        void this.router.navigate(['/dashboard']);
      }),
      map(() => HideLegalIdentitySaved()),
    ),
  );

  lookUpCompany$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LookUpCompany),
      switchMap(({ siret }) => this.registry.find(siret).pipe(map((company) => LookUpCompanyDone({ company })))),
    ),
  );
}
