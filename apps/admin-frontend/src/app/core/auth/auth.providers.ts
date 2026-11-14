import { EnvironmentProviders, isDevMode, makeEnvironmentProviders, Provider } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAuth0 } from '@auth0/auth0-angular';
import { environment } from '../../../environments/environment';
import { Auth } from './auth';
import { Auth0Auth } from './auth0.auth';
import { FakeAuth } from './fake.auth';
import { authFeature } from './auth.state';
import { AuthEffects } from './auth.effects';
import { AuthFacade } from './auth.facade';
import { StoreAuthFacade } from './store.auth.facade';

// The sign-in in the store, whichever identity provider is behind the port (ADR 0022).
const signIn: (Provider | EnvironmentProviders)[] = [
  provideState(authFeature),
  provideEffects(AuthEffects),
  { provide: AuthFacade, useClass: StoreAuthFacade },
];

// Production signs operators in with Auth0, through GitHub only, for the operator API's
// audience. The token stays in the SDK's memory cache (its default), not in
// localStorage, where a script injected into the page could read it; the price is
// signing in again after a reload. The interceptor attaches it to operator routes only.
export function provideAuth(): EnvironmentProviders {
  if (isDevMode()) {
    return makeEnvironmentProviders([{ provide: Auth, useClass: FakeAuth }, ...signIn]);
  }
  return makeEnvironmentProviders([
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: environment.auth0.audience,
        connection: 'github',
      },
      httpInterceptor: {
        allowedList: [`${environment.apiBaseUrl}/api/ops/*`],
      },
    }),
    { provide: Auth, useClass: Auth0Auth },
    ...signIn,
  ]);
}
