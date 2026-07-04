import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { Welcome } from './welcome';

describe('Welcome', () => {
  it('sends the vendor to the vitrine form to create their storefront', async () => {
    const view = await render(Welcome, {
      providers: [provideRouter([{ path: 'onboarding/storefront', component: Welcome }])],
    });
    const router = TestBed.inject(Router);

    fireEvent.click(screen.getByRole('button', { name: /créer ma vitrine/i }));
    await view.fixture.whenStable();

    expect(router.url).toBe('/onboarding/storefront');
  });
});
