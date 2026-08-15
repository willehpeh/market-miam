import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpBackend, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { appRoutes } from './app.routes';
import { CustomerStorefront } from './storefront/customer-storefront';

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

// Answering from the backend rather than from HttpTestingController: a resolver runs
// inside the navigation, so flushing it by hand means racing the router.
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
        provideRouter(appRoutes, withComponentInputBinding()),
        provideHttpClient(),
        { provide: HttpBackend, useValue: api },
      ],
    });
    api.fetched.length = 0;
    // One jsdom document serves the whole file, so a title set by an earlier test outlives it.
    TestBed.inject(Title).setTitle('');
    harness = await RouterTestingHarness.create();
  });

  // The host is localhost under jsdom, so the subdomain comes from the query param —
  // the same fallback local development uses.
  async function navigateTo(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  it('renders the storefront at the root', async () => {
    const page = await navigateTo('/?subdomain=acme');

    expect(page.textContent).toContain('Acme Bakery');
    expect(page.textContent).toContain('Prochain marché');
  });

  it('renders the carte at /carte', async () => {
    const page = await navigateTo('/carte?subdomain=acme');

    expect(page.textContent).toContain('Notre carte');
    expect(page.textContent).toContain('Bœuf bourguignon');
    expect(page.textContent).toContain('Tarte tatin');
  });

  // The carte is the page a search engine is most likely to land on, so it carries the
  // vendor's card too — the metadata follows the resolve, not the home page.
  it('titles the carte with the vendor, like the storefront', async () => {
    await navigateTo('/carte?subdomain=acme');

    expect(TestBed.inject(Title).getTitle()).toBe('Acme Bakery');
  });

  // Both pages are the same vendor's storefront: the resolve sits on the parent so moving
  // between them costs nothing.
  it('serves both pages from a single fetch', async () => {
    await navigateTo('/?subdomain=acme');
    await navigateTo('/carte?subdomain=acme');

    expect(api.fetched).toEqual(['/api/public/storefront/acme']);
  });
});
