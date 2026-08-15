import { DOCUMENT, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StorefrontHost } from './storefront-host';

function hostFor({ request, href }: { request?: Request; href?: string }): StorefrontHost {
  TestBed.configureTestingModule({
    providers: [
      { provide: REQUEST, useValue: request ?? null },
      { provide: DOCUMENT, useValue: { location: { href: href ?? 'http://localhost:4200/' } } },
    ],
  });
  return TestBed.inject(StorefrontHost);
}

describe('StorefrontHost', () => {
  // Behind Render, request.url resolves to the forwarded host while the `host` header stays
  // the internal .onrender.com name — the subdomain must come from the URL.
  it('names the vendor from the request url on the server', () => {
    const host = hostFor({ request: new Request('https://demo.marketmiam.fr/carte') });

    expect(host.subdomain).toBe('demo');
    expect(host.origin).toBe('https://demo.marketmiam.fr');
  });

  it('names the vendor from the browser location on the hydration re-run, where REQUEST is null', () => {
    const host = hostFor({ href: 'https://demo.marketmiam.fr/' });

    expect(host.subdomain).toBe('demo');
    expect(host.origin).toBe('https://demo.marketmiam.fr');
  });

  // www is the site, not a merchant. Asking the API for a vendor named "www" rendered
  // "Boutique introuvable" at the address most likely to be typed by hand.
  it('treats www as no vendor rather than as one', () => {
    expect(hostFor({ href: 'https://www.marketmiam.fr/' }).subdomain).toBeNull();
  });

  it('falls back to the query param where the host names no vendor', () => {
    expect(hostFor({ href: 'http://localhost:4200/?subdomain=acme' }).subdomain).toBe('acme');
  });

  // The fallback is read from the same URL on both sides, so a server render of a
  // development address resolves the vendor too.
  it('reads the fallback from the request url on the server', () => {
    expect(hostFor({ request: new Request('http://localhost:4200/?subdomain=acme') }).subdomain).toBe('acme');
  });

  it('names no vendor when nothing does', () => {
    expect(hostFor({ href: 'http://localhost:4200/' }).subdomain).toBeNull();
  });
});
