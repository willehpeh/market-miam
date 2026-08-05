import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { CataloguePage } from './catalogue/catalogue-page';
import { CatalogueList } from './catalogue/catalogue-list';
import { AddDish } from './catalogue/add-dish';
import { ReorderDishes } from './catalogue/reorder-dishes';
import { editableDish } from './catalogue/editable-dish.guard';
import { MarketsList } from './markets/markets-list';
import { AddSchedule } from './markets/add-schedule';
import { editableSchedule } from './markets/editable-schedule.guard';
import { Welcome } from './onboarding/welcome';
import { StorefrontForm } from './storefront/storefront-form';
import { authenticated } from './core/auth/authenticated.guard';

export const appRoutes: Route[] = [
  {
    path: 'onboarding',
    canActivateChild: [authenticated],
    children: [{ path: '', component: Welcome }],
  },
  {
    path: 'dashboard',
    canActivateChild: [authenticated],
    children: [
      { path: '', component: Dashboard },
      { path: 'information', component: StorefrontForm },
      {
        path: 'catalogue',
        children: [
          { path: 'new', component: AddDish },
          { path: ':itemId/edit', component: AddDish, canActivate: [editableDish] },
          {
            path: '',
            component: CataloguePage,
            children: [
              { path: '', component: CatalogueList },
              { path: 'order', component: ReorderDishes },
            ],
          },
        ],
      },
      {
        path: 'markets',
        children: [
          { path: '', component: MarketsList },
          { path: 'new', component: AddSchedule },
          { path: ':scheduleId/edit', component: AddSchedule, canActivate: [editableSchedule] },
        ],
      },
    ],
  },
  { path: '', component: Landing },
];
