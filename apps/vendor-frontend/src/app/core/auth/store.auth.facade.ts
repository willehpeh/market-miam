import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Login, Logout, selectAuthStatus } from './auth.state';
import { AuthFacade } from './auth.facade';

@Injectable()
export class StoreAuthFacade implements AuthFacade {
  private readonly store = inject(Store);

  readonly status = this.store.selectSignal(selectAuthStatus);

  login(): void {
    this.store.dispatch(Login());
  }

  logout(): void {
    this.store.dispatch(Logout());
  }
}
