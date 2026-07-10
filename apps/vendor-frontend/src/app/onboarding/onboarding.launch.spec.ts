import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
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
import { PhotoUploads } from '../storefront/photo-uploads';
import { FakePhotoUploads } from '../storefront/fake.photo-uploads';
import { storefrontFeature } from '../storefront/storefront.state';
import { StorefrontEffects, STOREFRONT_RETRY } from '../storefront/storefront.effects';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { StoreStorefrontFacade } from '../storefront/store.storefront.facade';
import { Catalogue } from '../catalogue/catalogue';
import { HttpCatalogue } from '../catalogue/http.catalogue';
import { catalogueFeature } from '../catalogue/catalogue.state';
import { CatalogueEffects } from '../catalogue/catalogue.effects';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { StoreCatalogueFacade } from '../catalogue/store.catalogue.facade';
import { onboardingFeature } from './onboarding.state';
import { OnboardingEffects, SAVED_REDIRECT_DELAY } from './onboarding.effects';
import { OnboardingFacade } from './onboarding.facade';
import { StoreOnboardingFacade } from './store.onboarding.facade';
import { provideNotifications } from '../core/notifications/notifications.providers';

const EMPTY = { name: '', description: '', phone: '', imageReference: '' };
const PHOTO_ONLY = { name: '', description: '', phone: '', imageReference: 'v1/storefronts/acme/cover-photo' };
const NAMED = { name: 'La Table de Margaux', description: 'Cuisine de marché', phone: '', imageReference: '' };

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
        provideState(catalogueFeature),
        provideState(onboardingFeature),
        provideEffects(AuthEffects, VendorEffects, StorefrontEffects, CatalogueEffects, OnboardingEffects),
        { provide: Auth, useClass: FakeAuth },
        { provide: Vendor, useClass: HttpVendor },
        { provide: Storefront, useClass: HttpStorefront },
        { provide: Catalogue, useClass: HttpCatalogue },
        { provide: PhotoUploads, useClass: FakePhotoUploads },
        { provide: AuthFacade, useClass: StoreAuthFacade },
        VendorFacade,
        { provide: StorefrontFacade, useClass: StoreStorefrontFacade },
        { provide: CatalogueFacade, useClass: StoreCatalogueFacade },
        { provide: OnboardingFacade, useClass: StoreOnboardingFacade },
        provideNotifications(),
        provideHttpClientTesting(),
        { provide: STOREFRONT_RETRY, useValue: { delayMs: 0, maxAttempts: 1 } },
        { provide: SAVED_REDIRECT_DELAY, useValue: 0 },
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

  it('sends a vendor who has named their storefront to the dashboard', async () => {
    const { view, auth, router } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(NAMED);
    await view.fixture.whenStable();

    expect(router.url).toBe('/dashboard');
    httpCtrl.expectOne('/api/catalogue').flush({ items: [] });
  });

  it('sends a vendor who has only added a photo to the form', async () => {
    const { view, auth, router } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(PHOTO_ONLY);
    await view.fixture.whenStable();

    expect(router.url).toBe('/onboarding/storefront');
  });

  it('sends the vendor to the dashboard once they confirm their storefront', async () => {
    const { view, auth, router } = await launch();
    auth.login();

    httpCtrl.expectOne('/api/vendors').flush(null);
    httpCtrl.expectOne('/api/storefront').flush(EMPTY);
    await view.fixture.whenStable();
    expect(router.url).toBe('/onboarding');

    fireEvent.click(screen.getByRole('button', { name: /créer ma vitrine/i }));
    await view.fixture.whenStable();
    expect(router.url).toBe('/onboarding/storefront');

    fireEvent.input(screen.getByLabelText(/nom du stand/i), { target: { value: 'La Table de Margaux' } });
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }));
    httpCtrl.expectOne('/api/storefront').flush(null);

    await waitFor(() => expect(router.url).toBe('/dashboard'));
    httpCtrl.expectOne('/api/catalogue').flush({ items: [] });
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
