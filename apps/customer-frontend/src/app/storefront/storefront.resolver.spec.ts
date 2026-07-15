import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { storefrontResolver } from './storefront.resolver';
import { CustomerStorefront } from './customer-storefront';

const ACME: CustomerStorefront = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverPhoto: null,
};

function resolve(queryParams: Record<string, string>): Observable<CustomerStorefront | null> {
  const route = { queryParamMap: convertToParamMap(queryParams) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(
    () => storefrontResolver(route, {} as RouterStateSnapshot),
  ) as Observable<CustomerStorefront | null>;
}

describe('storefrontResolver', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the storefront for the resolved subdomain', async () => {
    const result = firstValueFrom(resolve({ subdomain: 'acme' }));
    http.expectOne('/api/public/storefront/acme').flush(ACME);
    expect(await result).toEqual(ACME);
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
