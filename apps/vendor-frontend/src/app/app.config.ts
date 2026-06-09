import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAuth0 } from '@auth0/auth0-angular';
import { Auth } from './auth/auth';
import { Auth0Auth } from './auth/auth0.auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuth0({
      domain: "willalexander.eu.auth0.com",
      clientId: "8Aotn34QyliBSeJbDSK9VMuZOiwM7WuY",
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
    { provide: Auth, useClass: Auth0Auth }
  ],
};
