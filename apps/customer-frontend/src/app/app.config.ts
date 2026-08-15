import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideCloudinaryLoader } from '@angular/common';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    // The storefront and the carte swap under one outlet, so without this the document
    // keeps its scrollTop: a customer who scrolled deep into the home page opened the
    // carte already scrolled past its title, and vice versa. Forward navigations start
    // at the top, and a real back button still returns the customer to their place.
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withFetch()),
    // NgOptimizedImage builds the cover's URLs from a bare reference, so the crop lives in
    // the template beside the box it fills rather than in the view model.
    provideCloudinaryLoader(`https://res.cloudinary.com/${environment.cloudinary.cloudName}`),
  ],
};
