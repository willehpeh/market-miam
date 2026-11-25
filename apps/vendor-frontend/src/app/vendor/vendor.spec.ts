import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from '../core/auth/auth';
import { FakeAuth } from '../core/auth/fake.auth';
import { authFeature } from '../core/auth/auth.state';
import { AuthEffects } from '../core/auth/auth.effects';
import { AuthFacade } from '../core/auth/auth.facade';
import { StoreAuthFacade } from '../core/auth/store.auth.facade';
import { Vendor } from './vendor';
import { HttpVendor } from './http.vendor';
import { VendorEffects } from './vendor.effects';

// What registration leads to, the storefront loading or the landing page's error, is the
// onboarding launch's to show; this is the sign-in reaching the api.
describe('Vendor', () => {
  let auth: AuthFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Vendor, useClass: HttpVendor },
        { provide: Auth, useClass: FakeAuth },
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects, VendorEffects),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthFacade, useClass: StoreAuthFacade },
      ],
    });
    auth = TestBed.inject(AuthFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('registers the vendor once they have signed in', () => {
    auth.login();

    expect(httpCtrl.expectOne('/api/vendors').request.method).toBe('POST');
  });

  it('registers no one before anyone signs in', () => {
    httpCtrl.expectNone('/api/vendors');
  });
});
