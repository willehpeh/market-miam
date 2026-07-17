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
};

function resolve(queryParams: Record<string, string>): Observable<StorefrontViewModel | null> {
  const route = { queryParamMap: convertToParamMap(queryParams) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(
    () => storefrontResolver(route, {} as RouterStateSnapshot),
  ) as Observable<StorefrontViewModel | null>;
}

describe('storefrontResolver', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
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
});
