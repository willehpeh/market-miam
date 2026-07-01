import { HttpInterceptorFn } from '@angular/common/http';

// Dev-only: the API fakes auth in development but its guard still requires a
// bearer credential, so send a stub token. The real access-token interceptor
// (authHttpInterceptorFn) replaces this in production.
export const devAuthInterceptor: HttpInterceptorFn = (request, next) =>
  next(request.clone({ setHeaders: { Authorization: 'Bearer dev' } }));
