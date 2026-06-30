import { Injectable, signal } from '@angular/core';
import { AuthFacade } from './auth.facade';
import { AuthStatus } from './auth.state';

@Injectable()
export class FakeAuthFacade implements AuthFacade {
  readonly status = signal<AuthStatus>('anonymous');
  loggedIn = false;
  loggedOut = false;

  login(): void {
    this.loggedIn = true;
  }

  logout(): void {
    this.loggedOut = true;
  }
}
