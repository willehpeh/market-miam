import { Route } from '@angular/router';
import { authenticated } from './core/auth/authenticated.guard';
import { catalogueRoutes } from './catalogue/catalogue.routes';
import { marketsRoutes } from './markets/markets.routes';
import { marketDaysRoutes } from './market-days/market-days.routes';

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
        children: catalogueRoutes,
      },
      {
        path: 'market/:marketId/:date',
        children: marketDaysRoutes,
      },
      {
        path: 'market-prices/:marketId',
        loadComponent: () => import('./market-prices/price-editor').then(m => m.PriceEditor),
      },
      {
        path: 'markets',
        children: marketsRoutes,
      },
    ],
  },
  { path: '', loadComponent: () => import('./landing/landing').then(m => m.Landing) },
];
