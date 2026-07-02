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
    ],
  });
  const auth = TestBed.inject(Auth) as FakeAuth;
  const router = TestBed.inject(Router);
  await router.navigate(['/']);
  view.detectChanges();
  return { view, auth, router };
}

const loginButton = () => screen.queryByRole('button', { name: 'Se connecter' });
const logoutButton = () => screen.queryByRole('button', { name: 'Se déconnecter' });

describe('App', () => {
  it('smoke', async () => {
    const { view } = await renderApp();

    expect(view.fixture.componentInstance).toBeTruthy();
  });

  it('should offer the user the chance to log in again once they have logged out', async () => {
    const { view, auth } = await renderApp();
    auth.login();
    view.detectChanges();

    fireEvent.click(logoutButton()!);

    expect(loginButton()).toBeInTheDocument();
    expect(logoutButton()).not.toBeInTheDocument();
  });

  it('should redirect the vendor to the dashboard when login succeeds', async () => {
    const { view, auth, router } = await renderApp();
    auth.login();
    await view.fixture.whenStable();

    expect(router.url).toBe('/dashboard');
  });

  it('should bounce an anonymous visitor away from the dashboard', async () => {
    const { router } = await renderApp();
    await router.navigateByUrl('/dashboard');

    expect(router.url).toBe('/');
  });
});
