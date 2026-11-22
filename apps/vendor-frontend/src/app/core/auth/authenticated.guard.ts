import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthFacade } from './auth.facade';

// Holds the navigation until the session is known.
export const authenticated: CanActivateFn = () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  return auth.signedIn$.pipe(
    take(1),
    map(signedIn => signedIn || router.parseUrl('/')),
  );
};
