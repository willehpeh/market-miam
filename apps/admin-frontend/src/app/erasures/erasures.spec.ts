import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Erasures } from './erasures';
import { HttpErasures } from './http.erasures';
import { erasureFeature } from './erasure.state';
import { ErasureEffects } from './erasure.effects';
import { ErasureFacade } from './erasure.facade';
import { StoreErasureFacade } from './store.erasure.facade';

const ERASURE_OF = (vendorId: string) => (url: string) => url.endsWith(`/api/ops/vendors/${vendorId}/erasure`);

// The erasure feature from its facade to the operator API (ADR 0061).
describe('Erasures', () => {
  let facade: ErasureFacade;
  let http: HttpTestingController;

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
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("sends the vendor's erasure to the operator API", () => {
    facade.erase('acme-bakery');

    const request = http.expectOne((req) => ERASURE_OF('acme-bakery')(req.url));
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 202, statusText: 'Accepted' });
  });
});
