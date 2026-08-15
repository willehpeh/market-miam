import { DOCUMENT, inject, Injectable, REQUEST } from '@angular/core';

// Which vendor this page load is for, and where it lives.
//
// Server: read REQUEST.url — behind a trusted proxy Angular resolves it from
// X-Forwarded-Host, whereas the raw host header is the internal .onrender.com name.
// Client: REQUEST is null on the hydration re-run, so read the browser's location.
//
// Both are read from the same URL, which is why the ?subdomain= fallback does not need the
// router: a storefront is identified by the address the browser was pointed at, and that
// cannot change without a full page load. Fixed for the lifetime of the app, so it is a
// plain value rather than a signal.
@Injectable({ providedIn: 'root' })
export class StorefrontHost {
  private readonly url = pageUrl();

  readonly origin = this.url.origin;
  readonly subdomain = subdomainFrom(this.url);
}

function pageUrl(): URL {
  const request = inject(REQUEST, { optional: true });
  const document = inject(DOCUMENT);
  return new URL(request?.url ?? document.location.href);
}

// Localhost has no vendor label, so development names the vendor with an explicit query
// param instead — the same fallback the deployed site never reaches.
function subdomainFrom(url: URL): string | null {
  const label = url.hostname.split('.')[0];
  if (label && label !== 'localhost') {
    return label;
  }
  return url.searchParams.get('subdomain')?.trim() || null;
}
