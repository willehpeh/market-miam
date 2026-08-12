import { Route } from '@angular/router';
import { CartePage } from './storefront/carte/carte-page';
import { StorefrontPage } from './storefront/storefront-page';
import { storefrontResolver } from './storefront/storefront.resolver';

// The resolve sits on the componentless parent, so both children read one fetch of the
// subdomain's storefront and moving between them costs no request.
export const appRoutes: Route[] = [
  {
    path: '',
    resolve: { storefront: storefrontResolver },
    children: [
      { path: '', component: StorefrontPage },
      { path: 'carte', component: CartePage },
    ],
  },
];
