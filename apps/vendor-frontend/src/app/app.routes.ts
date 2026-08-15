import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { CataloguePage } from './catalogue/catalogue-page';
import { CatalogueList } from './catalogue/catalogue-list';
import { AddItem } from './catalogue/add-item';
import { ReorderItems } from './catalogue/reorder-items';
import { MarketsList } from './markets/markets-list';
import { AddSchedule } from './markets/add-schedule';
import { MenuEditor } from './market-days/menu-editor';
import { LiveScreen } from './market-days/live-screen';
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
          { path: 'new', component: AddItem },
          { path: ':itemId/edit', component: AddItem },
          {
            path: '',
            component: CataloguePage,
            children: [
              { path: '', component: CatalogueList },
              { path: 'order', component: ReorderItems },
            ],
          },
        ],
      },
      // Every screen below reads its own record reactively and shows a spinner, the
      // record, or "n'est plus …" — save exists only in the middle branch, so a cold
      // refresh cannot render empty and wipe anything. That is why none of them is
      // guarded: there is nothing left for a guard to protect.
      { path: 'menus/:marketId/:date', component: MenuEditor },
      // The live screen declines any day but today itself, exactly as the domain
      // refuses its commands.
      { path: 'live/:marketId/:date', component: LiveScreen },
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
