import { Injectable, Signal, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthFacade } from './auth.facade';
import { AuthStatus } from './auth.state';

@Injectable()
export class FakeAuthFacade implements AuthFacade {
  private readonly state = signal<AuthStatus>('anonymous');
  // A subject rather than a conversion of the signal above: the real facade's stream is
  // `store.select`, which hands a subscriber the current status immediately, and a
  // converted signal would replay whatever the last effect flush saw instead. A guard
  // subscribing mid-session has to see where the session actually is.
  private readonly statuses = new BehaviorSubject<AuthStatus>('anonymous');

  readonly status: Signal<AuthStatus> = this.state;
  readonly status$ = this.statuses.asObservable();
  loggedIn = false;
  loggedOut = false;

  setStatus(status: AuthStatus): void {
    this.state.set(status);
    this.statuses.next(status);
  }

  login(): void {
    this.loggedIn = true;
  }

  logout(): void {
    this.loggedOut = true;
  }
}
