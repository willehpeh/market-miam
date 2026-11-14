import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAuth } from './core/auth/auth.providers';
import { provideEnvHttp } from './core/http/provide-env-http';
import { provideNgrx } from './core/ngrx.providers';
import { provideInvitations } from './invitations/invitation.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuth(),
    provideEnvHttp(),
    provideNgrx(),
    provideInvitations(),
  ],
};
