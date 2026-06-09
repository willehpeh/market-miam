import { Auth } from './auth';
import { EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideAuth0 } from '@auth0/auth0-angular';
import { FakeAuth } from './fake.auth';
import { Auth0Auth } from './auth0.auth';

export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAuth0({
      domain: "willalexander.eu.auth0.com",
      clientId: "8Aotn34QyliBSeJbDSK9VMuZOiwM7WuY",
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
    { provide: Auth, useClass: isDevMode() ? FakeAuth : Auth0Auth }
  ])
}
