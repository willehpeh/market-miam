import { Route } from '@angular/router';
import { CartePage } from './storefront/carte/carte-page';
import { StorefrontFeed } from './storefront/storefront-feed';
import { StorefrontPage } from './storefront/storefront-page';
import { storefrontResolver } from './storefront/storefront.resolver';

// The resolve sits on the componentless parent, so both children read one fetch of the
// subdomain's storefront and moving between them costs no request. The feed lives here
// too, so the live poll runs regardless of which child renders (decision 17).
export const appRoutes: Route[] = [
  {
    path: '',
    resolve: { storefront: storefrontResolver },
    providers: [StorefrontFeed],
    children: [
      { path: '', component: StorefrontPage },
      { path: 'carte', component: CartePage },
    ],
  },
];
