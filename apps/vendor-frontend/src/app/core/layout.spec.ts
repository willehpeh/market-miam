import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Layout } from './layout';
import { AuthFacade } from './auth/auth.facade';
import { FakeAuthFacade } from './auth/fake.auth.facade';

async function renderLayout() {
  const view = await render(Layout, {
    providers: [{ provide: AuthFacade, useClass: FakeAuthFacade }],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  return { view, auth };
}

const logoutButton = () => screen.queryByRole('button', { name: 'Se déconnecter' });

describe('Layout', () => {
  it('should not display the logout button if the user is not authenticated', async () => {
    await renderLayout();

    expect(logoutButton()).not.toBeInTheDocument();
  });

  it('should display the logout button if the user is authenticated', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('authenticated');
    view.detectChanges();

    expect(logoutButton()).toBeInTheDocument();
  });

  it('should not display the logout button while the auth status is pending', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('pending');
    view.detectChanges();

    expect(logoutButton()).not.toBeInTheDocument();
  });

  it('should logout when clicked', async () => {
    const { view, auth } = await renderLayout();
    auth.status.set('authenticated');
    view.detectChanges();

    fireEvent.click(logoutButton()!);

    expect(auth.loggedOut).toBe(true);
  });
});
