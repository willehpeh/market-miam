import { DOCUMENT, inject, REQUEST } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { subdomainFrom } from './subdomain';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';

export const storefrontResolver: ResolveFn<StorefrontViewModel | null> = (route): Observable<StorefrontViewModel | null> => {
  const request = inject(REQUEST, { optional: true });
  const http = inject(HttpClient);
  // REQUEST is server-only; on client hydration the resolver re-runs with it null, so
  // fall back to location.host or the resolver returns null → "Boutique introuvable".
  const host = request?.headers.get('host') ?? inject(DOCUMENT).location.host;
  const subdomain = subdomainFrom(host, route.queryParamMap.get('subdomain'));
  if (!subdomain) {
    return of(null);
  }
  return http
    .get<CustomerStorefront>(`${environment.apiBaseUrl}/api/public/storefront/${subdomain}`)
    .pipe(map(toViewModel), catchError(() => of(null)));
};
