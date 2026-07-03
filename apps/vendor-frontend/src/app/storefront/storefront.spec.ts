import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Storefront } from './storefront';
import { HttpStorefront } from './http.storefront';
import { storefrontFeature } from './storefront.state';
import { StorefrontEffects, STOREFRONT_RETRY } from './storefront.effects';
import { StorefrontFacade } from './storefront.facade';
import { StoreStorefrontFacade } from './store.storefront.facade';

const ACME = { name: 'Acme Bakery', description: 'Fresh bread daily', imageReference: '' };

const notFound = { status: 404, statusText: 'Not Found' };

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('Storefront', () => {
  let facade: StorefrontFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Storefront, useClass: HttpStorefront },
        provideStore(),
        provideState(storefrontFeature),
        provideEffects(StorefrontEffects),
        provideHttpClientTesting(),
        { provide: StorefrontFacade, useClass: StoreStorefrontFacade },
        { provide: STOREFRONT_RETRY, useValue: { delayMs: 0, maxAttempts: 1 } },
      ],
    });
    facade = TestBed.inject(StorefrontFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests the storefront view when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/storefront');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the view arrives', () => {
    facade.load();

    httpCtrl.expectOne('/api/storefront');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the view once loaded', () => {
    facade.load();

    httpCtrl.expectOne('/api/storefront').flush(ACME);

    expect(facade.view()).toEqual(ACME);
    expect(facade.loading()).toBe(false);
  });

  it('retries after a 404 and loads once the storefront is projected', async () => {
    facade.load();

    httpCtrl.expectOne('/api/storefront').flush(null, notFound);
    await macrotask();
    httpCtrl.expectOne('/api/storefront').flush(ACME);

    expect(facade.view()).toEqual(ACME);
    expect(facade.loading()).toBe(false);
  });

  it('gives up and reports no view once retries are exhausted', async () => {
    facade.load();

    httpCtrl.expectOne('/api/storefront').flush(null, notFound);
    await macrotask();
    httpCtrl.expectOne('/api/storefront').flush(null, notFound);

    expect(facade.loading()).toBe(false);
    expect(facade.view()).toBeUndefined();
  });

  it('stops loading without retrying on a non-404 error', () => {
    facade.load();

    httpCtrl.expectOne('/api/storefront').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.view()).toBeUndefined();
  });

  it('sends the edited storefront information', () => {
    facade.save('La Table de Margaux', 'Cuisine de marché, mijotée maison.');

    const req = httpCtrl.expectOne('/api/storefront');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché, mijotée maison.',
    });
    req.flush(null);
  });
});
