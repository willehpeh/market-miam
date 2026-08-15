import { DOCUMENT, inject, REQUEST } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { currentOrigin } from '../core/request-url';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontMetadata } from './storefront-metadata';
import { StorefrontFeed } from './storefront-feed';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';

export const storefrontResolver: ResolveFn<StorefrontViewModel | null> = (route): Observable<StorefrontViewModel | null> => {
  const request = inject(REQUEST, { optional: true });
  const http = inject(HttpClient);
  const metadata = inject(StorefrontMetadata);
  const origin = currentOrigin();
  // Server: use request.url — behind a trusted proxy Angular resolves it from
  // X-Forwarded-Host, whereas the raw `host` header is the internal .onrender.com name.
  // Client: REQUEST is null on the hydration re-run, so read the browser's location.
  const host = request ? new URL(request.url).host : inject(DOCUMENT).location.host;
  const subdomain = subdomainFrom(host, route.queryParamMap.get('subdomain'));
  const storefront = subdomain
    ? http
        .get<CustomerStorefront>(`${environment.apiBaseUrl}/api/public/storefront/${subdomain}`)
        .pipe(map(toViewModel), catchError(() => of(null)))
    : of(null);
  // The card is set here rather than in a page, so every route under this resolve is
  // indexable as itself — and the tags are written during the SSR render pass either way.
  // The feed is seeded here too: the pages render from it, and while the vendor is
  // broadcasting it re-asks the server on its own (decision 8).
  const feed = inject(StorefrontFeed);
  return storefront.pipe(
    tap(view => metadata.set(view, origin)),
    tap(view => feed.seed(view, subdomain)),
  );
};

function subdomainFrom(host: string, queryParam: string | null): string | null {
  const label = host.split(':')[0].split('.')[0];
  if (label && label !== 'localhost') return label;
  return queryParam?.trim() || null;
}
