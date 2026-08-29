import { Routes } from '@angular/router';

export const marketsRoutes: Routes = [
  { path: '', loadComponent: () => import('./markets-list').then(m => m.MarketsList) },
  { path: 'new', loadComponent: () => import('./add-schedule').then(m => m.AddSchedule) },
  {
    path: ':scheduleId/edit',
    loadComponent: () => import('./add-schedule').then(m => m.AddSchedule),
  },
]
