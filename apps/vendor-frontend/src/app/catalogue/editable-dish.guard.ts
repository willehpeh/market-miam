import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { CatalogueFacade } from './catalogue.facade';

// The edit route reuses the add form, which reads its dish synchronously at construction.
// On a cold direct-nav the store is empty, so warm it (only when cold, to preserve an
// optimistic insert) and hold the route until the load settles. A dish that still isn't
// there is a stale link — bounce to the catalogue.
export const editableDish: CanActivateFn = (route) => {
  const catalogue = inject(CatalogueFacade);
  const router = inject(Router);
  if (catalogue.items().length === 0) {
    catalogue.load();
  }
  return toObservable(catalogue.loading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() =>
      catalogue.items().some((item) => item.itemId === route.paramMap.get('itemId'))
        ? true
        : router.parseUrl('/dashboard/catalogue'),
    ),
  );
};
