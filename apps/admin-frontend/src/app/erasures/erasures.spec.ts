import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FakeOperatorApi } from '../core/http/fake-operator-api';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Erasures } from './erasures';
import { HttpErasures } from './http.erasures';
import { erasureFeature } from './erasure.state';
import { ErasureEffects } from './erasure.effects';
import { ErasureFacade } from './erasure.facade';
import { StoreErasureFacade } from './store.erasure.facade';

// The erasure feature from its facade to the operator API (ADR 0061).
describe('Erasures', () => {
  let facade: ErasureFacade;
  let api: FakeOperatorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Erasures, useClass: HttpErasures },
        provideStore(),
        provideState(erasureFeature),
        provideEffects(ErasureEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErasureFacade, useClass: StoreErasureFacade },
      ],
    });
    facade = TestBed.inject(ErasureFacade);
    api = new FakeOperatorApi(TestBed.inject(HttpTestingController));
  });

  afterEach(() => api.verify());

  it("sends the vendor's erasure to the operator API", () => {
    facade.erase('acme-bakery');

    const request = api.erasureOf('acme-bakery');
    expect(request.method).toBe('POST');
    request.accept();
  });

  // So the list can hold that row still while it goes.
  it('reports whose erasure is in flight, and only while it is', () => {
    expect(facade.erasing()).toBeNull();

    facade.erase('acme-bakery');
    const request = api.erasureOf('acme-bakery');
    expect(facade.erasing()).toBe('acme-bakery');

    request.accept();
    expect(facade.erasing()).toBeNull();
  });

  it('reports whose erasure failed, until the next one starts', () => {
    facade.erase('acme-bakery');
    api.erasureOf('acme-bakery').fail();

    expect(facade.failed()).toBe('acme-bakery');
    expect(facade.erasing()).toBeNull();

    facade.erase('acme-bakery');
    expect(facade.failed()).toBeNull();
    api.erasureOf('acme-bakery').accept();
  });
});
