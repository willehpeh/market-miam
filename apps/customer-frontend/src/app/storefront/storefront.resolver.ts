import { inject, REQUEST } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { subdomainFrom } from './subdomain';
import { CustomerStorefront } from './customer-storefront';

export const storefrontResolver: ResolveFn<CustomerStorefront | null> = (route): Observable<CustomerStorefront | null> => {
  const request = inject(REQUEST, { optional: true });
  const http = inject(HttpClient);
  const subdomain = subdomainFrom(request?.headers.get('host') ?? null, route.queryParamMap.get('subdomain'));
  if (!subdomain) {
    return of(null);
  }
  return http
    .get<CustomerStorefront>(`${environment.apiBaseUrl}/api/public/storefront/${subdomain}`)
    .pipe(catchError(() => of(null)));
};
