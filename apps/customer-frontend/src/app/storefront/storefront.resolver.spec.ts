import { DOCUMENT, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { storefrontResolver } from './storefront.resolver';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel } from './storefront-view-model';

const ACME: CustomerStorefront = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverPhoto: 'v7/cover',
  dishes: [
    { itemId: 'dish-1', name: 'Bœuf bourguignon', description: 'Mijoté 7 heures', price: 1300, imageReference: 'v7/dish-1' },
    { itemId: 'dish-2', name: 'Tarte tatin', description: 'Aux pommes', price: 600, imageReference: '' },
  ],
  upcomingMarkets: [
    { date: '2026-06-18', weekday: 'THU', marketName: 'Marché Saint-Antoine', startTime: '08:00', endTime: '13:30', street: 'Quai Saint-Antoine', postalCode: '69002', town: 'Lyon', pitch: 'A3', cancelled: false },
    { date: '2026-06-23', weekday: 'TUE', marketName: 'Marché de la Croix-Rousse', startTime: '08:00', endTime: '13:00', postalCode: '69004', town: 'Lyon', cancelled: true },
  ],
};

function resolve(queryParams: Record<string, string>): Observable<StorefrontViewModel | null> {
  const route = { queryParamMap: convertToParamMap(queryParams) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(
    () => storefrontResolver(route, {} as RouterStateSnapshot),
  ) as Observable<StorefrontViewModel | null>;
}

describe('storefrontResolver', () => {
  let http: HttpTestingController;
  let location: { host: string };
  let request: Request | null;

  beforeEach(() => {
    location = { host: 'localhost' };
    request = null;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { location } },
        { provide: REQUEST, useFactory: () => request },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the published storefront to a view model with built urls and price labels', async () => {
    const result = firstValueFrom(resolve({ subdomain: 'acme' }));
    http.expectOne('/api/public/storefront/acme').flush(ACME);
    expect(await result).toEqual({
      status: 'published',
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      phone: '0102030405',
      coverUrl: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1200,h_750,q_auto,f_auto/v7/cover',
      dishes: [
        {
          itemId: 'dish-1',
          name: 'Bœuf bourguignon',
          description: 'Mijoté 7 heures',
          priceLabel: '13,00 €',
          photo: {
            cardUrl: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_400,q_auto,f_auto/v7/dish-1',
            sheetUrl: 'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1200,h_900,q_auto,f_auto/v7/dish-1',
          },
        },
        {
          itemId: 'dish-2',
          name: 'Tarte tatin',
          description: 'Aux pommes',
          priceLabel: '6,00 €',
          photo: null,
        },
      ],
      upcomingMarkets: [
        { weekday: 'JEU', day: '18', month: 'JUIN', marketName: 'Marché Saint-Antoine', hours: '8h – 13h30', address: 'Quai Saint-Antoine, Lyon', cancelled: false },
        { weekday: 'MAR', day: '23', month: 'JUIN', marketName: 'Marché de la Croix-Rousse', hours: '8h – 13h', address: 'Lyon', cancelled: true },
      ],
    });
  });

  it('passes the coming-soon storefront through', async () => {
    const result = firstValueFrom(resolve({ subdomain: 'acme' }));
    http.expectOne('/api/public/storefront/acme').flush({ status: 'coming-soon', name: 'Acme Bakery' });
    expect(await result).toEqual({ status: 'coming-soon', name: 'Acme Bakery' });
  });

  it('resolves to null when the api returns 404', async () => {
    const result = firstValueFrom(resolve({ subdomain: 'ghost' }));
    http.expectOne('/api/public/storefront/ghost').flush('Not found', { status: 404, statusText: 'Not Found' });
    expect(await result).toBeNull();
  });

  it('resolves to null without calling the api when no subdomain is present', async () => {
    const result = await firstValueFrom(resolve({}));
    expect(result).toBeNull();
    http.expectNone(() => true);
  });

  it('derives the subdomain from location.host on the client, where REQUEST is null', async () => {
    location.host = 'demo.marketmiam.fr';
    const result = firstValueFrom(resolve({}));
    http.expectOne('/api/public/storefront/demo').flush({ status: 'coming-soon', name: 'Chez Demo' });
    expect(await result).toEqual({ status: 'coming-soon', name: 'Chez Demo' });
  });

  it('derives the subdomain from request.url on the server, not the internal proxy host', async () => {
    // Behind Render, request.url resolves to the forwarded host while the `host`
    // header stays the internal .onrender.com name — the resolver must use the URL.
    request = new Request('https://demo.marketmiam.fr/');
    const result = firstValueFrom(resolve({}));
    http.expectOne('/api/public/storefront/demo').flush({ status: 'coming-soon', name: 'Chez Demo' });
    expect(await result).toEqual({ status: 'coming-soon', name: 'Chez Demo' });
  });
});
