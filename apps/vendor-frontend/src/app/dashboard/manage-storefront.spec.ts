import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { ManageStorefront } from './manage-storefront';

async function renderHub() {
  return render(ManageStorefront, { providers: [provideRouter([])] });
}

describe('ManageStorefront', () => {
  it('opens the information, catalogue and markets pages', async () => {
    await renderHub();

    expect(screen.getByRole('link', { name: 'Informations' })).toHaveAttribute('href', '/dashboard/information');
    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/dashboard/catalogue');
    expect(screen.getByRole('link', { name: 'Marchés' })).toHaveAttribute('href', '/dashboard/markets');
  });

  it('returns to the dashboard', async () => {
    await renderHub();

    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard');
  });
});
