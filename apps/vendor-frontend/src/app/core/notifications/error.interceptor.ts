import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { ErrorRaised } from './notifications.state';
import { isApiRequest } from '../http/api-request';

export const GENERIC_ERROR = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.';

// Surfaces only infrastructure failures the app can't recover from — our API
// broke (5xx) or the network is unreachable (status 0). A third-party call
// reports its own failures where it makes them. Domain outcomes (4xx)
// stay with each effect's own catchError. Always rethrows so those still fire.
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

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
