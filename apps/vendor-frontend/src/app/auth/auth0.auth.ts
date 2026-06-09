import { inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Auth } from './auth';
import { AuthService } from '@auth0/auth0-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Injectable()
export class Auth0Auth implements Auth {

  private readonly _auth = inject(AuthService);
  private readonly _isAuthenticated: WritableSignal<boolean> = signal(false);
  private readonly _isAuthLoading: WritableSignal<boolean> = signal(true);

  constructor() {
    this._auth.isAuthenticated$.pipe(
      takeUntilDestroyed(),
      tap(isAuth => this._isAuthenticated.set(isAuth))
    ).subscribe();
    this._auth.isLoading$.pipe(
      takeUntilDestroyed(),
      tap(isLoading => this._isAuthLoading.set(isLoading))
    ).subscribe();
  }

  login(): void {
    this._auth.loginWithRedirect();
  }

  isAuthenticated(): Signal<boolean> {
    return this._isAuthenticated;
  }

  isLoading(): Signal<boolean> {
    return this._isAuthLoading;
  }

  logout(): void {
    this._auth.logout();
  }
}
