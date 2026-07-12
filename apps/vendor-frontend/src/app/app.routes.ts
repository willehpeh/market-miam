import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { CatalogueList } from './catalogue/catalogue-list';
import { AddDish } from './catalogue/add-dish';
import { MarketsList } from './markets/markets-list';
import { AddSchedule } from './markets/add-schedule';
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
      {
        path: 'markets',
        children: [
          { path: '', component: MarketsList },
          { path: 'new', component: AddSchedule },
          { path: ':scheduleId/edit', component: AddSchedule },
        ],
      },
    ],
  },
  { path: '', component: Landing },
];
