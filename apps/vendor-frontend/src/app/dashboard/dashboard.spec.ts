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
  it('displays the storefront name and description', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '', imageReference: '' });
    view.detectChanges();

    expect(screen.getByText('Acme Bakery')).toBeInTheDocument();
    expect(screen.getByText('Fresh bread daily')).toBeInTheDocument();
  });
});
