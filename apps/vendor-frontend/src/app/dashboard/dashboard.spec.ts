import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';

async function renderDashboard() {
  const view = await render(Dashboard, {
    providers: [provideRouter([]), { provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, storefront };
}

const completeStorefront: StorefrontView = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '',
  imageReference: 'v42/storefronts/acme/cover-photo',
};

describe('Dashboard', () => {
  it('leaves every setup step to do for a vendor without a storefront', async () => {
    await renderDashboard();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/onboarding/storefront');
    expect(screen.getByRole('link', { name: /composez votre catalogue/i })).toHaveAttribute('href', '/dashboard/catalogue');
    expect(screen.getByRole('link', { name: /indiquez vos marchés/i })).toHaveAttribute('href', '/dashboard/markets');
    expect(screen.queryByText('Fait')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('marks the storefront step done once name, description and photo are set', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set(completeStorefront);
    view.detectChanges();

    expect(screen.getByText('Fait')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /informations de la vitrine/i })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('link', { name: /composez votre catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /indiquez vos marchés/i })).toBeInTheDocument();
  });

  it('keeps the storefront step to do while the cover photo is missing', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set({ ...completeStorefront, imageReference: '' });
    view.detectChanges();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/onboarding/storefront');
    expect(screen.queryByText('Fait')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
