import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from '../core/auth/auth';
import { FakeAuth } from '../core/auth/fake.auth';
import { authFeature } from '../core/auth/auth.state';
import { AuthEffects } from '../core/auth/auth.effects';
import { AuthFacade } from '../core/auth/auth.facade';
import { Vendor } from './vendor';
import { HttpVendor } from './http.vendor';
import { vendorFeature } from './vendor.state';
import { VendorEffects } from './vendor.effects';
import { VendorFacade } from './vendor.facade';

describe('Vendor', () => {
  let auth: AuthFacade;
  let facade: VendorFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Vendor, useClass: HttpVendor },
        provideStore(),
        provideState(authFeature),
        provideState(vendorFeature),
        provideEffects(AuthEffects),
        provideEffects(VendorEffects),
        provideHttpClientTesting(),
        AuthFacade,
        VendorFacade,
        { provide: Auth, useClass: FakeAuth },
      ],
    });
    auth = TestBed.inject(AuthFacade);
    facade = TestBed.inject(VendorFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  it('should register vendor when login succeeds', () => {
    auth.login();

    const req = httpCtrl.expectOne('/api/vendor/register');
    expect(req.request.method).toBe('POST');
  });

  it('should show as loading when registering', () => {
    auth.login();

    httpCtrl.expectOne('/api/vendor/register');
    expect(facade.loading()).toBe(true);
  });

  it('should stop showing as loading when registration succeeds', () => {
    auth.login();

    const req = httpCtrl.expectOne('/api/vendor/register');
    req.flush({ vendorId: '123' });

    expect(facade.loading()).toBe(false);
  });

  it('should stop showing as loading when registration fails', () => {
    auth.login();

    const req = httpCtrl.expectOne('/api/vendor/register');
    req.flush({ error: 'error' }, { status: 400, statusText: 'Bad Request' });

    expect(facade.loading()).toBe(false);
  });

  afterEach(() => {
    httpCtrl.verify();
  });
});
