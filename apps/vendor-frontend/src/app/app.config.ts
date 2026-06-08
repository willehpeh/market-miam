import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideAuth0 } from '@auth0/auth0-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuth0({
      domain: "willalexander.eu.auth0.com",
      clientId: "8Aotn34QyliBSeJbDSK9VMuZOiwM7WuY",
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ],
};
