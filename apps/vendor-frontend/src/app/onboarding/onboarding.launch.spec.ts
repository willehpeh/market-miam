import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from '../app';
import { appRoutes } from '../app.routes';
import { Auth } from '../core/auth/auth';
import { FakeAuth } from '../core/auth/fake.auth';
import { authFeature } from '../core/auth/auth.state';
import { AuthEffects } from '../core/auth/auth.effects';
import { AuthFacade } from '../core/auth/auth.facade';
import { StoreAuthFacade } from '../core/auth/store.auth.facade';
import { Vendor } from '../vendor/vendor';
import { HttpVendor } from '../vendor/http.vendor';
import { vendorFeature } from '../vendor/vendor.state';
import { VendorEffects } from '../vendor/vendor.effects';
import { VendorFacade } from '../vendor/vendor.facade';
import { Storefront } from '../storefront/storefront';
import { HttpStorefront } from '../storefront/http.storefront';
import { storefrontFeature } from '../storefront/storefront.state';
import { StorefrontEffects, STOREFRONT_RETRY } from '../storefront/storefront.effects';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { StoreStorefrontFacade } from '../storefront/store.storefront.facade';
import { onboardingFeature } from './onboarding.state';
import { OnboardingEffects } from './onboarding.effects';
import { OnboardingFacade } from './onboarding.facade';
import { StoreOnboardingFacade } from './store.onboarding.facade';

const EMPTY = { name: '', description: '', imageReference: '' };
const NAMED = { name: 'La Table de Margaux', description: 'Cuisine de marché', imageReference: '' };

describe('Onboarding launch', () => {
  let httpCtrl: HttpTestingController;

  async function launch() {
    const view = await render(App, {
      providers: [
        provideRouter(appRoutes),
        provideStore(),
        provideState(authFeature),
        provideState(vendorFeature),
        provideState(storefrontFeature),
        provideState(onboardingFeature),
        provideEffects(AuthEffects, VendorEffects, StorefrontEffects, OnboardingEffects),
        { provide: Auth, useClass: FakeAuth },
        { provide: Vendor, useClass: HttpVendor },
        { provide: Storefront, useClass: HttpStorefront },
        { provide: AuthFacade, useClass: StoreAuthFacade },
        VendorFacade,
        { provide: StorefrontFacade, useClass: StoreStorefrontFacade },
        { provide: OnboardingFacade, useClass: StoreOnboardingFacade },
        provideHttpClientTesting(),
        { provide: STOREFRONT_RETRY, useValue: { delayMs: 0, maxAttempts: 1 } },
      ],
    });
    const auth = TestBed.inject(Auth) as FakeAuth;
    const router = TestBed.inject(Router);
    const onboarding = TestBed.inject(OnboardingFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
    await router.navigate(['/']);
    view.detectChanges();
    return { view, auth, router, onboarding };
  }

  afterEach(() => httpCtrl.verify());

  it('sends a vendor with an empty storefront to the welcome screen', async () => {
    const { view, auth, router } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(EMPTY);
    await view.fixture.whenStable();

    expect(router.url).toBe('/onboarding');
  });

  it('sends a vendor with storefront information to the form', async () => {
    const { view, auth, router } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(NAMED);
    await view.fixture.whenStable();

    expect(router.url).toBe('/onboarding/storefront');
  });

  it('surfaces the load error code and stays on the landing page', async () => {
    const { view, auth, router, onboarding } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(null, { status: 500, statusText: 'Server Error' });
    view.detectChanges();

    expect(onboarding.errorCode()).toBe(500);
    expect(router.url).toBe('/');
    expect(screen.getByText(/code 500/i)).toBeVisible();
  });

  it('surfaces a registration error code', async () => {
    const { view, auth, onboarding } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null, { status: 502, statusText: 'Bad Gateway' });
    view.detectChanges();

    expect(onboarding.errorCode()).toBe(502);
  });

  it('re-drives registration and load when the vendor retries', async () => {
    const { view, auth, router } = await launch();
    auth.login();
    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(null, { status: 500, statusText: 'Server Error' });
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(EMPTY);
    await view.fixture.whenStable();

    expect(router.url).toBe('/onboarding');
  });
});
