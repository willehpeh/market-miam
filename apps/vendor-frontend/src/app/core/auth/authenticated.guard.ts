import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthFacade } from './auth.facade';

// Holds the navigation until the session says something other than "still asking".
export const authenticated: CanActivateFn = () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  return auth.status$.pipe(
    filter(status => status !== 'pending'),
    take(1),
    map(status => (status === 'authenticated' ? true : router.parseUrl('/'))),
  );
};
