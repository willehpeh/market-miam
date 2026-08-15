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
  // The whole signed-in app, with the slices only it uses. See dashboard.routes.ts for
  // which providers moved and which had to stay at bootstrap.
  {
    path: 'dashboard',
    canActivateChild: [authenticated],
    loadChildren: () => import('./dashboard.routes').then(m => m.dashboardRoutes),
  },
  { path: '', loadComponent: () => import('./landing/landing').then(m => m.Landing) },
];
