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

// Labels that are the site rather than a vendor. Without this, www.marketmiam.fr asks the
// API for a vendor named "www" and renders "Boutique introuvable" at the address most
// likely to be typed by hand.
const RESERVED_LABELS = new Set(['localhost', 'www']);

// A reserved label has no vendor behind it, so development names one with an explicit
// query param instead — the fallback the deployed site never reaches.
function subdomainFrom(url: URL): string | null {
  const label = url.hostname.split('.')[0];
  if (label && !RESERVED_LABELS.has(label)) {
    return label;
  }
  return url.searchParams.get('subdomain')?.trim() || null;
}
