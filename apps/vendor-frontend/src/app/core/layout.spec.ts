import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Layout } from './layout';
import { AuthFacade } from './auth/auth.facade';
import { FakeAuthFacade } from './auth/fake.auth.facade';
import { NotificationsFacade } from './notifications/notifications.facade';
import { FakeNotificationsFacade } from './notifications/fake.notifications.facade';

const LOGOUT = { name: 'Se déconnecter' };

async function renderLayout() {
  const view = await render(Layout, {
    providers: [
      { provide: AuthFacade, useClass: FakeAuthFacade },
      { provide: NotificationsFacade, useClass: FakeNotificationsFacade },
    ],
  });
  const auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
  const notifications = TestBed.inject(NotificationsFacade) as FakeNotificationsFacade;
  return { view, auth, notifications };
}

describe('Layout', () => {
  it('should not display the logout button if the user is not authenticated', async () => {
    await renderLayout();

    expect(screen.queryByRole('button', LOGOUT)).not.toBeInTheDocument();
  });

  // AGPL §13 owes the source offer to the users of *this* interface. Vendors live in
  // the app and never pass through the marketing site, so losing this link would put
  // the deployment out of compliance rather than just out of style.
  it('should offer the source code, signed in or not', async () => {
    await renderLayout();

    expect(screen.getByRole('link', { name: 'Logiciel libre' })).toHaveAttribute(
      'href',
      'https://marketmiam.fr/mentions-legales#licence',
    );
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

  it('should not show an error banner when there is no message', async () => {
    await renderLayout();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show the error banner when a message is raised', async () => {
    const { view, notifications } = await renderLayout();
    notifications.message.set('Une erreur est survenue');
    view.detectChanges();

    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur est survenue');
  });

  it('should dismiss the error banner when closed', async () => {
    const { view, notifications } = await renderLayout();
    notifications.message.set('Une erreur est survenue');
    view.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    view.detectChanges();

    expect(notifications.dismissed).toBe(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
