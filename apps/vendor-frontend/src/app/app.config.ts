import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { provideAuth } from './core/auth/auth.providers';
import { provideVendor } from './vendor/vendor.providers';
import { provideNgrx } from './core/ngrx.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // Auth0's access-token interceptor only in production; dev is fully faked.
    provideHttpClient(withInterceptors(isDevMode() ? [] : [authHttpInterceptorFn])),
    provideAuth(),
    provideVendor(),
    provideNgrx()
  ],
};
