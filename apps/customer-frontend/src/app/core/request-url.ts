import { DOCUMENT, inject, REQUEST } from '@angular/core';

// Absolute origin of the current storefront request — used as the canonical
// `og:url` so a shared link resolves to one entry per vendor subdomain.
// Server: read REQUEST.url — behind a trusted proxy Angular resolves it from
// X-Forwarded-Host, whereas the raw host header is the internal .onrender.com name.
// Client: REQUEST is null on the hydration re-run, so read the browser's location.
export function currentOrigin(): string {
  const request = inject(REQUEST, { optional: true });
  if (request) {
    return new URL(request.url).origin;
  }
  return inject(DOCUMENT).location.origin;
}
