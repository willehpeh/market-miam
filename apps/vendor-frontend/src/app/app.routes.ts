import { Route } from '@angular/router';
import { Landing } from './landing/landing';
import { Dashboard } from './dashboard/dashboard';
import { Onboarding } from './onboarding/onboarding';
import { authenticated } from './core/auth/authenticated.guard';

export const appRoutes: Route[] = [
  { path: 'onboarding', component: Onboarding, canActivate: [authenticated] },
  { path: 'dashboard', component: Dashboard, canActivate: [authenticated] },
  { path: '', component: Landing }
];
