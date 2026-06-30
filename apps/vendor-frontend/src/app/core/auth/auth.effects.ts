import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { combineLatest, distinctUntilChanged, filter, map, tap } from 'rxjs';
import { Auth } from './auth';
import { AuthLoadingChanged, Login, LoginSuccess, Logout, LogoutSuccess } from './auth.state';
import { Router } from '@angular/router';

@Injectable()
export class AuthEffects {

  private readonly actions$ = inject(Actions);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly login$ = createEffect(() => this.actions$.pipe(
    ofType(Login),
    tap(() => this.auth.login()),
  ), { dispatch: false });

  readonly logout$ = createEffect(() => this.actions$.pipe(
    ofType(Logout),
    tap(() => this.auth.logout()),
  ), { dispatch: false });

  readonly loading$ = createEffect(() => this.auth.isLoading$().pipe(
    distinctUntilChanged(),
    map(isLoading => AuthLoadingChanged({ isLoading })),
  ));

  readonly session$ = createEffect(() => combineLatest([this.auth.isLoading$(), this.auth.userId$()]).pipe(
    filter(([isLoading]) => !isLoading),
    map(([, userId]) => userId),
    distinctUntilChanged(),
    map(userId => (userId !== null ? LoginSuccess({ userId }) : LogoutSuccess())),
  ));

  readonly redirect$ = createEffect(() => this.actions$.pipe(
    ofType(LoginSuccess),
    tap(() => this.router.navigate(['dashboard'])),
  ), { dispatch: false });
}
