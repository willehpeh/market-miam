import { Route } from '@angular/router';
import { authenticated } from './core/auth/authenticated.guard';

// Every screen loads on demand. A signed-out vendor is entitled to download the landing
// page and nothing else, and a vendor on their dashboard has no use for the live screen,
// the reorder list, or either editor until they open one.
export const appRoutes: Route[] = [
  {
    path: 'onboarding',
    canActivateChild: [authenticated],
    children: [{ path: '', loadComponent: () => import('./onboarding/welcome').then(m => m.Welcome) }],
  },
  {
    path: 'dashboard',
    canActivateChild: [authenticated],
    children: [
      { path: '', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
      {
        path: 'information',
        loadComponent: () => import('./storefront/storefront-form').then(m => m.StorefrontForm),
      },
      {
        path: 'catalogue',
        children: [
          { path: 'new', loadComponent: () => import('./catalogue/add-item').then(m => m.AddItem) },
          { path: ':itemId/edit', loadComponent: () => import('./catalogue/add-item').then(m => m.AddItem) },
          {
            path: '',
            loadComponent: () => import('./catalogue/catalogue-page').then(m => m.CataloguePage),
            children: [
              { path: '', loadComponent: () => import('./catalogue/catalogue-list').then(m => m.CatalogueList) },
              { path: 'order', loadComponent: () => import('./catalogue/reorder-items').then(m => m.ReorderItems) },
            ],
          },
        ],
      },
      // Every screen below reads its own record reactively and shows a spinner, the
      // record, or "n'est plus …" — save exists only in the middle branch, so a cold
      // refresh cannot render empty and wipe anything. That is why none of them is
      // guarded: there is nothing left for a guard to protect.
      {
        path: 'menus/:marketId/:date',
        loadComponent: () => import('./market-days/menu-editor').then(m => m.MenuEditor),
      },
      // The live screen declines any day but today itself, exactly as the domain
      // refuses its commands.
      {
        path: 'live/:marketId/:date',
        loadComponent: () => import('./market-days/live-screen').then(m => m.LiveScreen),
      },
      // Reckoning is the third mode, and the furthest from planning and trading in time,
      // place and mood (decision 70) — so it is a route of its own rather than a tenth
      // state on the live screen. Both read the same day slot.
      {
        path: 'bilan/:marketId/:date',
        loadComponent: () => import('./market-days/bilan').then(m => m.Bilan),
      },
      // Prices belong to the market, not to the schedule that stands at it: two schedules
      // at one market are two cards pointing at one list (decision 1).
      {
        path: 'market-prices/:marketId',
        loadComponent: () => import('./market-prices/price-editor').then(m => m.PriceEditor),
      },
      {
        path: 'markets',
        children: [
          { path: '', loadComponent: () => import('./markets/markets-list').then(m => m.MarketsList) },
          { path: 'new', loadComponent: () => import('./markets/add-schedule').then(m => m.AddSchedule) },
          {
            path: ':scheduleId/edit',
            loadComponent: () => import('./markets/add-schedule').then(m => m.AddSchedule),
          },
        ],
      },
    ],
  },
  { path: '', loadComponent: () => import('./landing/landing').then(m => m.Landing) },
];
