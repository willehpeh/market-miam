import { inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Auth } from './auth';
import { AuthService } from '@auth0/auth0-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Injectable()
export class Auth0Auth implements Auth {

  private readonly _auth = inject(AuthService);
  private readonly _isAuthenticated: WritableSignal<boolean> = signal(false);

  constructor() {
    this._auth.isAuthenticated$.pipe(
      takeUntilDestroyed(),
      tap(isAuth => this._isAuthenticated.set(isAuth))
    ).subscribe();
  }

  login(): void {
    this._auth.loginWithRedirect();
  }

  isAuthenticated(): Signal<boolean> {
    return this._isAuthenticated;
  }
}
