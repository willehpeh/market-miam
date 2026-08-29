import { Routes } from '@angular/router';

export const marketDaysRoutes: Routes = [
  { path: 'menu', loadComponent: () => import('./menu-editor').then(m => m.MenuEditor) },
  { path: 'live', loadComponent: () => import('./live-screen/live-screen').then(m => m.LiveScreen) },
  { path: 'bilan', loadComponent: () => import('./bilan/bilan').then(m => m.Bilan) },
]
