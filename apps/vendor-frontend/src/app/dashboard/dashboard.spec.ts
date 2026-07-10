import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';

async function renderDashboard() {
  const view = await render(Dashboard, {
    providers: [
      provideRouter([]),
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
    ],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  return { view, storefront, catalogue };
}

const completeStorefront: StorefrontView = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '',
  imageReference: 'v42/storefronts/acme/cover-photo',
};

const aDish: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme/item-1',
};

describe('Dashboard', () => {
  it('leaves every setup step to do for a vendor without a storefront', async () => {
    await renderDashboard();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/onboarding/storefront');
    expect(screen.getByRole('link', { name: /composez votre catalogue/i })).toHaveAttribute('href', '/dashboard/catalogue');
    expect(screen.getByRole('link', { name: /indiquez vos marchés/i })).toHaveAttribute('href', '/dashboard/markets');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Manquants : nom, description, photo')).toBeInTheDocument();
  });

  it('marks the storefront step done once name, description and photo are set', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set(completeStorefront);
    view.detectChanges();

    expect(screen.getByText('Renseignés : nom, description, photo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/onboarding/storefront');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('link', { name: /composez votre catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /indiquez vos marchés/i })).toBeInTheDocument();
  });

  it('loads the catalogue on arrival', async () => {
    const { catalogue } = await renderDashboard();
    expect(catalogue.loaded).toBe(true);
  });

  it('marks the catalogue step done and shows the dish count once dishes exist', async () => {
    const { view, catalogue } = await renderDashboard();
    catalogue.items.set([aDish]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 plat ajouté')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the dish count', async () => {
    const { view, catalogue } = await renderDashboard();
    catalogue.items.set([aDish, { ...aDish, itemId: 'item-2' }]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).getByText('2 plats ajoutés')).toBeInTheDocument();
  });

  it('leaves the catalogue step to do while it holds no dishes', async () => {
    await renderDashboard();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).queryByText('✓')).not.toBeInTheDocument();
  });

  it('keeps the storefront step to do while the cover photo is missing', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set({ ...completeStorefront, imageReference: '' });
    view.detectChanges();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/onboarding/storefront');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Renseignés : nom, description · Manquant : photo')).toBeInTheDocument();
  });
});
