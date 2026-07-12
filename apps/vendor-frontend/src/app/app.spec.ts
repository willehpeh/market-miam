import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent, RenderResult } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { App } from './app';
import { appRoutes } from './app.routes';
import { Auth } from './core/auth/auth';
import { FakeAuth } from './core/auth/fake.auth';
import { authFeature } from './core/auth/auth.state';
import { AuthEffects } from './core/auth/auth.effects';
import { AuthFacade } from './core/auth/auth.facade';
import { StoreAuthFacade } from './core/auth/store.auth.facade';
import { StorefrontFacade } from './storefront/storefront.facade';
import { FakeStorefrontFacade } from './storefront/fake.storefront.facade';
import { OnboardingFacade } from './onboarding/onboarding.facade';
import { FakeOnboardingFacade } from './onboarding/fake.onboarding.facade';
import { NotificationsFacade } from './core/notifications/notifications.facade';
import { FakeNotificationsFacade } from './core/notifications/fake.notifications.facade';

async function renderApp() {
  const view = await render(App, {
    providers: [
      provideRouter(appRoutes),
      provideStore(),
      provideState(authFeature),
      provideEffects(AuthEffects),
      { provide: AuthFacade, useClass: StoreAuthFacade },
      { provide: Auth, useClass: FakeAuth },
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: OnboardingFacade, useClass: FakeOnboardingFacade },
      { provide: NotificationsFacade, useClass: FakeNotificationsFacade },
    ],
  });
  const auth = TestBed.inject(Auth) as FakeAuth;
  const router = TestBed.inject(Router);
  await router.navigate(['/']);
  view.detectChanges();
  return { view, auth, router };
}

const LOGIN = { name: 'Se connecter' };
const LOGOUT = { name: 'Se déconnecter' };

describe('App', () => {
  let _view: RenderResult<App, App>;
  let _auth: FakeAuth;
  let _router: Router;

  beforeEach(async () => {
    const { view, auth, router } = await renderApp();
    _view = view;
    _auth = auth;
    _router = router;
  })

  it('smoke', async () => {
    expect(_view.fixture.componentInstance).toBeTruthy();
  });

  it('should offer the vendor the chance to log in again once they have logged out', async () => {
    await givenVendorIsLoggedIn();

    clickLogoutButton();

    expectLoginButtonVisible();
    expectLogoutButtonNotInDocument();
  });

  it('should bounce an anonymous visitor away from the dashboard', async () => {
    givenUserIsAnonymous();
    await tryToGoToDashboard();
    expectRouteToBeRoot();
  });

  function givenUserIsAnonymous(): void {
    // no-op
  }

  async function tryToGoToDashboard() {
    await _router.navigateByUrl('/dashboard');
  }

  function expectRouteToBeRoot() {
    expect(_router.url).toBe('/');
  }

  async function givenVendorIsLoggedIn() {
    _auth.login();
    _view.detectChanges();
  }

  function clickLogoutButton() {
    fireEvent.click(screen.getByRole('button', LOGOUT));
  }

  function expectLoginButtonVisible() {
    expect(screen.getByRole('button', LOGIN)).toBeVisible();
  }

  function expectLogoutButtonNotInDocument() {
    expect(screen.queryByRole('button', LOGOUT)).not.toBeInTheDocument();
  }
});
