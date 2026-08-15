import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { Welcome } from './welcome';

describe('Welcome', () => {
  // The dashboard's steps are the "pas à pas" this page promises; the form is step one
  // of them, not the thing to drop a vendor into cold.
  it('sends the vendor to the dashboard to start setting up', async () => {
    const view = await render(Welcome, {
      providers: [provideRouter([{ path: 'dashboard', component: Welcome }])],
    });
    const router = TestBed.inject(Router);

    const start = screen.getByRole('link', { name: /créer ma vitrine/i });
    // A link, so it carries an address: middle-click, open-in-new-tab and "copy link"
    // all work, and assistive tech announces where it goes rather than "button".
    expect(start).toHaveAttribute('href', '/dashboard');

    fireEvent.click(start);
    await view.fixture.whenStable();

    expect(router.url).toBe('/dashboard');
  });
});
