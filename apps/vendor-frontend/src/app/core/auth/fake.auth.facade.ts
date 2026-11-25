import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, filter, map } from 'rxjs';
import { AuthFacade } from './auth.facade';
import { AuthStatus } from './auth.state';

@Injectable()
export class FakeAuthFacade implements AuthFacade {
  private readonly status = signal<AuthStatus>('anonymous');
  // A subject rather than a conversion of the signal above: the real facade's stream is
  // `store.select`, which hands a subscriber the current status immediately, and a
  // converted signal would replay whatever the last effect flush saw instead. A guard
  // subscribing mid-session has to see where the session actually is.
  private readonly statuses = new BehaviorSubject<AuthStatus>('anonymous');

  readonly signedIn = computed(() => this.status() === 'authenticated');
  readonly signedOut = computed(() => this.status() === 'anonymous');
  readonly signedIn$ = this.statuses.pipe(
    filter((status) => status !== 'pending'),
    map((status) => status === 'authenticated'),
  );
  loggedIn = false;
  loggedOut = false;

  setStatus(status: AuthStatus): void {
    this.status.set(status);
    this.statuses.next(status);
  }

  login(): void {
    this.loggedIn = true;
  }

  logout(): void {
    this.loggedOut = true;
  }
}
