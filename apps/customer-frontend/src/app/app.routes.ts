import { Route } from '@angular/router';
import { StorefrontPage } from './storefront/storefront-page';
import { storefrontResolver } from './storefront/storefront.resolver';

export const appRoutes: Route[] = [
  {
    path: '',
    component: StorefrontPage,
    resolve: { storefront: storefrontResolver },
  },
];
