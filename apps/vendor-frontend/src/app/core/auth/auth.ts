import { Observable } from 'rxjs';

export abstract class Auth {
  abstract login(): void;

  abstract logout(): void;

  abstract isLoading$(): Observable<boolean>;

  abstract userId$(): Observable<string | null>;
}
