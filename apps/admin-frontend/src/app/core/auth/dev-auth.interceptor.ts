import { HttpInterceptorFn } from '@angular/common/http';
import { isApiRequest } from '../http/api-request';

// Dev-only: the api fakes operator sign-in in development, but its guard still wants a
// bearer credential, so send a stub. In production, Auth0's interceptor sends the real
// access token instead, scoped to the operator API by its allowedList.
export const devAuthInterceptor: HttpInterceptorFn = (request, next) =>
  isApiRequest(request.url)
    ? next(request.clone({ setHeaders: { Authorization: 'Bearer dev' } }))
    : next(request);
