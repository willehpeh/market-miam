import { TestBed } from '@angular/core/testing';
import { provideState, provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginSuccess } from '../core/auth/auth.state';
import { Vendor } from './vendor';
import { HttpVendor } from './http.vendor';
import { vendorFeature } from './vendor.state';
import { VendorEffects } from './vendor.effects';
import { VendorFacade } from './vendor.facade';

describe('Vendor', () => {
  let store: Store;
  let facade: VendorFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Vendor, useClass: HttpVendor },
        provideStore(),
        provideState(vendorFeature),
        provideEffects(VendorEffects),
        provideHttpClientTesting(),
        VendorFacade,
      ],
    });
    store = TestBed.inject(Store);
    facade = TestBed.inject(VendorFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  it('should register vendor when login succeeds', () => {
    store.dispatch(LoginSuccess({ userId: 'vendor-1' }));

    const req = httpCtrl.expectOne('/api/vendors');
    expect(req.request.method).toBe('POST');
  });

  it('should show as loading when registering', () => {
    store.dispatch(LoginSuccess({ userId: 'vendor-1' }));

    httpCtrl.expectOne('/api/vendors');
    expect(facade.loading()).toBe(true);
  });

  it('should stop showing as loading when registration succeeds', () => {
    store.dispatch(LoginSuccess({ userId: 'vendor-1' }));

    const req = httpCtrl.expectOne('/api/vendors');
    req.flush({ vendorId: '123' });

    expect(facade.loading()).toBe(false);
  });

  it('should stop showing as loading when registration fails', () => {
    store.dispatch(LoginSuccess({ userId: 'vendor-1' }));

    const req = httpCtrl.expectOne('/api/vendors');
    req.flush({ error: 'error' }, { status: 400, statusText: 'Bad Request' });

    expect(facade.loading()).toBe(false);
  });

  afterEach(() => {
    httpCtrl.verify();
  });
});
