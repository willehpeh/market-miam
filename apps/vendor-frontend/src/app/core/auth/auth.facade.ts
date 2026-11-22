import { Signal } from '@angular/core';
import { Observable } from 'rxjs';

export abstract class AuthFacade {
  abstract readonly signedIn: Signal<boolean>;
  // Known to be signed out, which is not the same as not signed in: the session may still be
  // settling.
  abstract readonly signedOut: Signal<boolean>;
  // Whether the vendor is signed in, once the session is known, as a stream for the router.
  // A guard runs outside any component's lifetime, so a guard that converts a signal itself
  // mints a watcher per navigation that nothing ever destroys (angular/angular#51280).
  // Handing it a stream the facade already owns means there is no per-navigation anything
  // to leak.
  abstract readonly signedIn$: Observable<boolean>;

  abstract login(): void;

  abstract logout(): void;
}
