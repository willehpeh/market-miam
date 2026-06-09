import { Signal } from '@angular/core';

export abstract class Auth {
  abstract login(): void;

  abstract logout(): void;

  abstract isAuthenticated(): Signal<boolean>;

  abstract isLoading(): Signal<boolean>;
}
