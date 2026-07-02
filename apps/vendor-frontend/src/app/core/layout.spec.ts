import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Layout } from './layout';
import { AuthFacade } from './auth/auth.facade';
import { FakeAuthFacade } from './auth/fake.auth.facade';

const LOGOUT = { name: 'Se déconnecter' };

async function renderLayout() {
  const view = await render(Layout, {
    providers: [{ provide: AuthFacade, useClass: FakeAuthFacade }],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  return { view, auth };
}

describe('Layout', () => {
  it('should not display the logout button if the user is not authenticated', async () => {
    await renderLayout();

    expect(screen.queryByRole('button', LOGOUT)).not.toBeInTheDocument();
  });

  it('should display the logout button if the user is authenticated', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('authenticated');
    view.detectChanges();

    expect(screen.getByRole('button', LOGOUT)).toBeVisible();
  });

  it('should not display the logout button while the auth status is pending', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('pending');
    view.detectChanges();

    expect(screen.queryByRole('button', LOGOUT)).not.toBeInTheDocument();
  });

  it('should logout when clicked', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('authenticated');
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', LOGOUT));

    expect(auth.loggedOut).toBe(true);
  });
});
