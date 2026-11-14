import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthFacade } from './auth.facade';
import { authFeature, Login, Logout, selectAuthStatus } from './auth.state';

@Injectable()
export class StoreAuthFacade implements AuthFacade {
  private readonly store = inject(Store);

  readonly status = this.store.selectSignal(selectAuthStatus);
  readonly userId = this.store.selectSignal(authFeature.selectUserId);

  login(): void {
    this.store.dispatch(Login());
  }

  logout(): void {
    this.store.dispatch(Logout());
  }
}
