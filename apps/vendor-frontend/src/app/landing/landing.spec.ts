import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Landing } from './landing';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';

async function renderLanding() {
  const view = await render(Landing, {
    providers: [{ provide: AuthFacade, useClass: FakeAuthFacade }],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  return { view, auth };
}

const loginButton = () => screen.queryByRole('button', { name: 'Se connecter' });

describe('Landing', () => {
  it('should display the login button if the user is anonymous', async () => {
    await renderLanding();

    expect(loginButton()).toBeInTheDocument();
  });

  it('should not display the login button while the auth status is pending', async () => {
    const { view, auth } = await renderLanding();
    auth.status.set('pending');
    view.detectChanges();

    expect(loginButton()).not.toBeInTheDocument();
  });

  it('should not display the login button if the user is authenticated', async () => {
    const { view, auth } = await renderLanding();
    auth.status.set('authenticated');
    view.detectChanges();

    expect(loginButton()).not.toBeInTheDocument();
  });

  it('should start login when clicked', async () => {
    const { auth } = await renderLanding();

    fireEvent.click(loginButton()!);

    expect(auth.loggedIn).toBe(true);
  });
});
