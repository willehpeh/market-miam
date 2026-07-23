import { DOCUMENT, inject, REQUEST } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';

export const storefrontResolver: ResolveFn<StorefrontViewModel | null> = (route): Observable<StorefrontViewModel | null> => {
  const request = inject(REQUEST, { optional: true });
  const http = inject(HttpClient);
  // Server: use request.url — behind a trusted proxy Angular resolves it from
  // X-Forwarded-Host, whereas the raw `host` header is the internal .onrender.com name.
  // Client: REQUEST is null on the hydration re-run, so read the browser's location.
  const host = request ? new URL(request.url).host : inject(DOCUMENT).location.host;
  const subdomain = subdomainFrom(host, route.queryParamMap.get('subdomain'));
  if (!subdomain) {
    return of(null);
  }
  return http
    .get<CustomerStorefront>(`${environment.apiBaseUrl}/api/public/storefront/${subdomain}`)
    .pipe(map(toViewModel), catchError(() => of(null)));
};

function subdomainFrom(host: string, queryParam: string | null): string | null {
  const label = host.split(':')[0].split('.')[0];
  if (label && label !== 'localhost') return label;
  return queryParam?.trim() || null;
}
