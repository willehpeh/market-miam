import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAuth } from './core/auth/auth.providers';
import { provideVendor } from './vendor/vendor.providers';
import { provideNgrx } from './core/ngrx.providers';
import { Errors, FakeErrors } from './core/errors/errors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuth(),
    provideVendor(),
    provideNgrx(),
    // TODO: make real errors implementation
    { provide: Errors, useClass: FakeErrors }
  ],
};
