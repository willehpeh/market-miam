import { Auth } from './auth';
import { EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideAuth0 } from '@auth0/auth0-angular';
import { FakeAuth } from './fake.auth';
import { Auth0Auth } from './auth0.auth';
import { provideState } from '@ngrx/store';
import { authFeature } from './auth.state';
import { provideEffects } from '@ngrx/effects';
import { AuthFacade } from './auth.facade';
import { StoreAuthFacade } from './store.auth.facade';
import { AuthEffects } from './auth.effects';
import { environment } from '../../../environments/environment';

export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAuth0({
      domain: "willalexander.eu.auth0.com",
      clientId: "8Aotn34QyliBSeJbDSK9VMuZOiwM7WuY",
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: 'https://api.marketmiam.fr'
      },
      httpInterceptor: {
        allowedList: [`${environment.apiBaseUrl}/*`],
      },
    }),
    { provide: Auth, useClass: isDevMode() ? FakeAuth : Auth0Auth },
    provideState(authFeature),
    provideEffects(AuthEffects),
    { provide: AuthFacade, useClass: StoreAuthFacade },
  ])
}
