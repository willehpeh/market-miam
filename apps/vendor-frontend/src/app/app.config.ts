import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
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
import { Share } from './core/share';
import { WebShare } from './core/web.share';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Sibling routes swap under one outlet, so without this the document keeps its
    // scrollTop: a vendor who scrolled to a dish deep in their catalogue opened its
    // form already scrolled past the top of it. Forward navigations start at the top,
    // and a real back button still returns the vendor to their place in the list.
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    // Prod attaches the real Auth0 access token; dev sends a stub token the API's
    // faked verifier accepts (its guard still requires a bearer credential).
    provideHttpClient(
      withInterceptors(isDevMode() ? [devAuthInterceptor, errorInterceptor] : [authHttpInterceptorFn, errorInterceptor]),
    ),
    { provide: Share, useClass: WebShare },
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
