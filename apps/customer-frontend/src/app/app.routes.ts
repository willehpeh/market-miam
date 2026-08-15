import { Route } from '@angular/router';
import { CartePage } from './storefront/carte/carte-page';
import { StorefrontFeed } from './storefront/storefront-feed';
import { StorefrontPage } from './storefront/storefront-page';

// The feed is provided on the componentless parent, so both children read one fetch of the
// subdomain's storefront and moving between them costs no request — the request is keyed on
// the subdomain, which a client-side navigation cannot change. The live poll runs from here
// too, regardless of which child renders (decision 17).
export const appRoutes: Route[] = [
  {
    path: '',
    providers: [StorefrontFeed],
    children: [
      { path: '', component: StorefrontPage },
      { path: 'carte', component: CartePage },
    ],
  },
];
