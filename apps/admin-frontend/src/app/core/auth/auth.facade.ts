import { Signal } from '@angular/core';
import { AuthStatus } from './auth.state';

export abstract class AuthFacade {
  abstract readonly status: Signal<AuthStatus>;
  abstract readonly userId: Signal<string | null>;

  abstract login(): void;

  abstract logout(): void;
}
