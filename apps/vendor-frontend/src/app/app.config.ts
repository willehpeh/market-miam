import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideNotifications } from './core/notifications/notifications.providers';
import { provideAuth } from './core/auth/auth.providers';
import { provideVendor } from './vendor/vendor.providers';
import { provideStorefront } from './storefront/storefront.providers';
import { provideCatalogue } from './catalogue/catalogue.providers';
import { provideMarketSchedules } from './markets/market-schedule.providers';
import { provideMarketDays } from './market-days/market-day.providers';
import { provideMarketPrices } from './market-prices/market-prices.providers';
import { provideSellingRecord } from './selling-record/selling-record.providers';
import { provideOnboarding } from './onboarding/onboarding.providers';
import { provideNgrx } from './core/ngrx.providers';
import { Share } from './core/share';
import { WebShare } from './core/web.share';
import { provideEnvHttp } from './core/http/provide-env-http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideEnvHttp(),
    { provide: Share, useClass: WebShare },
    provideNotifications(),
    provideAuth(),
    provideVendor(),
    provideStorefront(),
    provideCatalogue(),
    provideMarketSchedules(),
    provideMarketDays(),
    provideMarketPrices(),
    provideSellingRecord(),
    provideOnboarding(),
    provideNgrx()
  ],
};
