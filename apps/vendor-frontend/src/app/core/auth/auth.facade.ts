import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { authFeature, Login, Logout, selectIsAuthenticated } from './auth.state';

@Injectable()
export class AuthFacade {
  private readonly store = inject(Store);

  readonly isLoading = this.store.selectSignal(authFeature.selectIsLoading);
  readonly isAuthenticated = this.store.selectSignal(selectIsAuthenticated);

  login(): void {
    this.store.dispatch(Login());
  }

  logout(): void {
    this.store.dispatch(Logout());
  }
}
