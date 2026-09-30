import { Route } from '@angular/router';

export const catalogueRoutes: Route[] = [
  { path: 'new', loadComponent: () => import('./add-item').then(m => m.AddItem) },
  { path: ':itemId/edit', loadComponent: () => import('./add-item').then(m => m.AddItem) },
  {
    path: '',
    loadComponent: () => import('./catalogue-page').then(m => m.CataloguePage),
    children: [
      { path: '', loadComponent: () => import('./catalogue-list').then(m => m.CatalogueList) },
      { path: 'order', loadComponent: () => import('./reorder-items').then(m => m.ReorderItems) },
    ],
  },
]
