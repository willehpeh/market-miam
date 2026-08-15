import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthStatus } from './auth.state';

export abstract class AuthFacade {
  abstract readonly status: Signal<AuthStatus>;
  // The same status as a stream, for the router. A guard runs outside any component's
  // lifetime, so a guard that converts the signal itself mints a watcher per navigation
  // that nothing ever destroys (angular/angular#51280). Handing it a stream the facade
  // already owns means there is no per-navigation anything to leak.
  abstract readonly status$: Observable<AuthStatus>;

  abstract login(): void;

  abstract logout(): void;
}
