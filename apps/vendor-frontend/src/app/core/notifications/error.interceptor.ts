import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { ErrorRaised } from './notifications.state';

export const GENERIC_ERROR = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.';

// Surfaces only infrastructure failures the app can't recover from — the server
// broke (5xx) or the network is unreachable (status 0). Domain outcomes (4xx)
// stay with each effect's own catchError. Always rethrows so those still fire.
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(Store);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0 || error.status >= 500) {
        store.dispatch(ErrorRaised({ message: GENERIC_ERROR }));
      }
      return throwError(() => error);
    }),
  );
};
