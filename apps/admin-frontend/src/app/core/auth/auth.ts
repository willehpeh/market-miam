import { Observable } from 'rxjs';

// The admin app's port onto its identity provider, as in the vendor app (ADR 0022):
// Auth0Auth in production, FakeAuth in development and tests.
export abstract class Auth {
  abstract login(): void;

  abstract logout(): void;

  abstract isLoading$(): Observable<boolean>;

  abstract userId$(): Observable<string | null>;
}
