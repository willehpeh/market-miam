import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { devAuthInterceptor } from './core/auth/dev-auth.interceptor';
import { errorInterceptor } from './core/notifications/error.interceptor';
import { provideNotifications } from './core/notifications/notifications.providers';
import { provideAuth } from './core/auth/auth.providers';
import { provideVendor } from './vendor/vendor.providers';
import { provideStorefront } from './storefront/storefront.providers';
import { provideCatalogue } from './catalogue/catalogue.providers';
import { provideMarketSchedules } from './markets/market-schedule.providers';
import { provideOnboarding } from './onboarding/onboarding.providers';
import { provideNgrx } from './core/ngrx.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // Prod attaches the real Auth0 access token; dev sends a stub token the API's
    // faked verifier accepts (its guard still requires a bearer credential).
    provideHttpClient(
      withInterceptors(isDevMode() ? [devAuthInterceptor, errorInterceptor] : [authHttpInterceptorFn, errorInterceptor]),
    ),
    provideNotifications(),
    provideAuth(),
    provideVendor(),
    provideStorefront(),
    provideCatalogue(),
    provideMarketSchedules(),
    provideOnboarding(),
    provideNgrx()
  ],
};
