import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Landing } from './landing';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';
import { OnboardingFacade } from '../onboarding/onboarding.facade';
import { FakeOnboardingFacade } from '../onboarding/fake.onboarding.facade';

const LOGIN = { name: 'Se connecter' };
const RETRY = { name: 'Réessayer' };

async function renderLanding() {
  const view = await render(Landing, {
    providers: [
      { provide: AuthFacade, useClass: FakeAuthFacade },
      { provide: OnboardingFacade, useClass: FakeOnboardingFacade },
    ],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  const onboarding = TestBed.inject(OnboardingFacade) as FakeOnboardingFacade;
  return { view, auth, onboarding };
}

describe('Landing', () => {
  it('should display the login button if the user is anonymous', async () => {
    await renderLanding();

    expect(screen.getByRole('button', LOGIN)).toBeVisible();
  });

  it('should not display the login button while the auth status is pending', async () => {
    const { view, auth } = await renderLanding();
    auth.status.set('pending');
    view.detectChanges();

    expect(screen.queryByRole('button', LOGIN)).not.toBeInTheDocument();
  });

  it('should not display the login button if the user is authenticated', async () => {
    const { view, auth } = await renderLanding();
    auth.status.set('authenticated');
    view.detectChanges();

    expect(screen.queryByRole('button', LOGIN)).not.toBeInTheDocument();
  });

  it('should start login when clicked', async () => {
    const { auth } = await renderLanding();

    fireEvent.click(screen.getByRole('button', LOGIN));

    expect(auth.loggedIn).toBe(true);
  });

  it('shows a preparing state once authenticated while the storefront is readied', async () => {
    const { view, auth } = await renderLanding();
    auth.status.set('authenticated');
    view.detectChanges();

    expect(screen.getByText('Nous préparons votre stand…')).toBeVisible();
  });

  it('shows the error with its code when preparation fails', async () => {
    const { view, auth, onboarding } = await renderLanding();
    auth.status.set('authenticated');
    onboarding.errorCode.set(503);
    view.detectChanges();

    expect(screen.getByText(/code 503/i)).toBeVisible();
    expect(screen.queryByText('Nous préparons votre stand…')).not.toBeInTheDocument();
  });

  it('retries preparation when the vendor clicks Réessayer', async () => {
    const { view, auth, onboarding } = await renderLanding();
    auth.status.set('authenticated');
    onboarding.errorCode.set(500);
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', RETRY));

    expect(onboarding.retried).toBe(true);
  });
});
