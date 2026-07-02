import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

async function renderDashboard() {
  const view = await render(Dashboard, {
    providers: [{ provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  return { view, storefront };
}

describe('Dashboard', () => {
  it('displays the storefront name and description once loaded', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set({ name: 'Acme Bakery', description: 'Fresh bread daily', imageReference: '' });
    view.detectChanges();

    expect(screen.getByText('Acme Bakery')).toBeInTheDocument();
    expect(screen.getByText('Fresh bread daily')).toBeInTheDocument();
  });

  it('shows a setting-up state while loading', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.loading.set(true);
    view.detectChanges();

    expect(screen.getByText('Nous préparons votre stand…')).toBeVisible();
  });

  it('asks the facade to load on init', async () => {
    const { storefront } = await renderDashboard();
    expect(storefront.loaded).toBe(true);
  });
});
