import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthFacade } from './auth.facade';

export const authenticated: CanActivateFn = () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  return toObservable(auth.status).pipe(
    filter(status => status !== 'pending'),
    take(1),
    map(status => (status === 'authenticated' ? true : router.parseUrl('/'))),
  );
};
