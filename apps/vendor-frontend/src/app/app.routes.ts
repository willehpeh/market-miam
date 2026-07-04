import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { Welcome } from './onboarding/welcome';
import { StorefrontForm } from './onboarding/storefront-form';
import { authenticated } from './core/auth/authenticated.guard';

export const appRoutes: Route[] = [
  {
    path: 'onboarding',
    canActivateChild: [authenticated],
    children: [
      { path: '', component: Welcome },
      { path: 'storefront', component: StorefrontForm },
    ],
  },
  { path: 'dashboard', component: Dashboard, canActivate: [authenticated] },
  { path: '', component: Landing },
];
