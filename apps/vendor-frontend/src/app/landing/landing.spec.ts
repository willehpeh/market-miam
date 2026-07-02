import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Landing } from './landing';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';

const LOGIN = { name: 'Se connecter' };

async function renderLanding() {
  const view = await render(Landing, {
    providers: [{ provide: AuthFacade, useClass: FakeAuthFacade }],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  return { view, auth };
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
});
