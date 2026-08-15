import { Route } from '@angular/router';
import { provideCatalogue } from './catalogue/catalogue.providers';
import { provideMarketSchedules } from './markets/market-schedule.providers';
import { provideMarketDays } from './market-days/market-day.providers';

// The three slices only a signed-in vendor ever touches, provided where they are used
// rather than at bootstrap. Their state, effects and HTTP adapters arrive with this
// chunk, so the landing page no longer carries the catalogue's photo pipeline or the
// market-day poller.
//
// The rest stay global on purpose: auth, vendor, onboarding and storefront form one
// chain at boot — LoginSuccess → RegisterVendor → RegisterVendorSuccess → LoadStorefront
// → LoadStorefrontSuccess → the navigation that decides between /onboarding and
// /dashboard. An effect in that chain that is not listening when its action fires would
// strand the vendor on "Nous préparons votre stand…" for good.
export const dashboardRoutes: Route[] = [
  {
    path: '',
    providers: [provideCatalogue(), provideMarketSchedules(), provideMarketDays()],
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
];
