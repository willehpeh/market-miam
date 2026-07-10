import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { ComingSoon } from './dashboard/coming-soon';
import { CatalogueList } from './catalogue/catalogue-list';
import { AddDish } from './catalogue/add-dish';
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
  {
    path: 'dashboard',
    canActivateChild: [authenticated],
    children: [
      { path: '', component: Dashboard },
      {
        path: 'catalogue',
        children: [
          { path: '', component: CatalogueList },
          { path: 'new', component: AddDish },
        ],
      },
      { path: 'markets', component: ComingSoon, data: { title: 'Indiquez vos marchés' } },
    ],
  },
  { path: '', component: Landing },
];
