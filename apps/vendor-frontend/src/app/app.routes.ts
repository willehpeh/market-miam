import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { authenticated } from './core/auth/authenticated.guard';

export const appRoutes: Route[] = [
  { path: 'dashboard', component: Dashboard, canActivate: [authenticated] },
  { path: '', component: Landing }
];
