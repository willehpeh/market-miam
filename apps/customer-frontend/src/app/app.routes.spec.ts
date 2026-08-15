import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpBackend, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { appRoutes } from './app.routes';
import { StorefrontHost } from './core/storefront-host';
import { CustomerStorefront } from './storefront/customer-storefront';

const ORIGIN = 'https://acme.marketmiam.fr';

const ACME: CustomerStorefront = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverPhoto: '',
  items: [
    { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté 7 heures', price: 1300, imageReference: '' },
    { itemId: 'item-2', name: 'Tarte tatin', description: 'Aux pommes', price: 600, imageReference: '' },
  ],
  upcomingMarkets: [
    { date: '2026-06-18', weekday: 'THU', marketName: 'Marché Saint-Antoine', startTime: '08:00', endTime: '13:30', street: 'Quai Saint-Antoine', postalCode: '69002', town: 'Lyon', cancelled: false, inProgress: false, items: [], soldOutItemIds: [] },
  ],
};

// Answering from the backend rather than from HttpTestingController: the feed fetches on
// its own schedule, so flushing it by hand means racing the resource.
class FakeApi implements HttpBackend {
  readonly fetched: string[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    this.fetched.push(request.url);
    return of(new HttpResponse({ body: ACME }));
  }
}

describe('storefront routes', () => {
  const api = new FakeApi();
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        { provide: HttpBackend, useValue: api },
        // The vendor is named by the address the browser was pointed at, which a router
        // harness does not move.
        { provide: StorefrontHost, useValue: { subdomain: 'acme', origin: ORIGIN } },
      ],
    });
    api.fetched.length = 0;
    // One jsdom document serves the whole file, so a title set by an earlier test outlives it.
    TestBed.inject(Title).setTitle('');
    harness = await RouterTestingHarness.create();
  });

  async function navigateTo(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    // The feed's request is issued and resolved through the resource's effect, so the page
    // renders its storefront on the tick after the navigation settles.
    TestBed.tick();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const metaContent = (selector: string): string | null =>
    TestBed.inject(Meta).getTag(selector)?.content ?? null;
  const canonical = (): string | null =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null;

  it('renders the storefront at the root', async () => {
    const page = await navigateTo('/');

    expect(page.textContent).toContain('Acme Bakery');
    expect(page.textContent).toContain('Prochain marché');
  });

  it('renders the carte at /carte', async () => {
    const page = await navigateTo('/carte');

    expect(page.textContent).toContain('Notre carte');
    expect(page.textContent).toContain('Bœuf bourguignon');
    expect(page.textContent).toContain('Tarte tatin');
  });

  // The carte is the page a search engine is most likely to land on, so it carries the
  // vendor's card too.
  it('titles the carte with the vendor, like the storefront', async () => {
    await navigateTo('/carte');

    expect(TestBed.inject(Title).getTitle()).toBe('Acme Bakery');
  });

  // Same card, but not the same address: two pages advertising one og:url compete for the
  // same entry, and a link shared from the carte resolves to the home page.
  it('gives each page its own canonical address', async () => {
    await navigateTo('/');
    expect(metaContent('property="og:url"')).toBe(ORIGIN);

    await navigateTo('/carte');
    expect(metaContent('property="og:url"')).toBe(`${ORIGIN}/carte`);
    expect(canonical()).toBe(`${ORIGIN}/carte`);
  });

  // Both pages are the same vendor's storefront: the feed sits on the parent route and is
  // keyed on the subdomain, so moving between them costs nothing.
  it('serves both pages from a single fetch', async () => {
    await navigateTo('/');
    await navigateTo('/carte');

    expect(api.fetched).toEqual(['/api/public/storefront/acme']);
  });
});
