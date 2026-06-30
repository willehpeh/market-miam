import { Signal } from '@angular/core';
import { AuthStatus } from './auth.state';

export abstract class AuthFacade {
  abstract readonly status: Signal<AuthStatus>;

  abstract login(): void;

  abstract logout(): void;
}
