import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
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
  it('smoke', async () => {
    const { view } = await renderApp();

    expect(view.fixture.componentInstance).toBeTruthy();
  });

  it('should offer the user the chance to log in again once they have logged out', async () => {
    const { view, auth } = await renderApp();
    auth.login();
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', LOGOUT));

    expect(screen.getByRole('button', LOGIN)).toBeVisible();
    expect(screen.queryByRole('button', LOGOUT)).not.toBeInTheDocument();
  });

  it('should bounce an anonymous visitor away from the dashboard', async () => {
    const { router } = await renderApp();
    await router.navigateByUrl('/dashboard');

    expect(router.url).toBe('/');
  });
});
