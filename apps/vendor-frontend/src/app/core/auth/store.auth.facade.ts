import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs';
import { Login, Logout, selectAuthStatus, selectSignedIn, selectSignedOut } from './auth.state';
import { AuthFacade } from './auth.facade';

@Injectable()
export class StoreAuthFacade implements AuthFacade {
  private readonly store = inject(Store);

  readonly signedIn = this.store.selectSignal(selectSignedIn);
  readonly signedOut = this.store.selectSignal(selectSignedOut);
  // Straight off the store: no effect, no signal converted, nothing to clean up.
  readonly signedIn$ = this.store.select(selectAuthStatus).pipe(
    filter((status) => status !== 'pending'),
    map((status) => status === 'authenticated'),
  );

  login(): void {
    this.store.dispatch(Login());
  }

  logout(): void {
    this.store.dispatch(Logout());
  }
}
