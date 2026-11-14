import { Injectable, signal } from '@angular/core';
import { AuthFacade } from './auth.facade';
import { AuthStatus } from './auth.state';

@Injectable()
export class FakeAuthFacade implements AuthFacade {
  static readonly USER_ID = 'github|1234567';
  readonly status = signal<AuthStatus>('anonymous');
  readonly userId = signal<string | null>(null);
  loginStarted = false;
  loggedOut = false;

  // Signs in at once, as the identity provider does once its page sends the operator back.
  login(): void {
    this.loginStarted = true;
    this.userId.set(FakeAuthFacade.USER_ID);
    this.status.set('authenticated');
  }

  logout(): void {
    this.loggedOut = true;
    this.userId.set(null);
    this.status.set('anonymous');
  }
}
