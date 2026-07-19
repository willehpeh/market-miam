import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';
import { MarketScheduleView } from '../markets/market-schedules';

async function renderDashboard() {
  const view = await render(Dashboard, {
    providers: [
      provideRouter([]),
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
      { provide: MarketScheduleFacade, useClass: FakeMarketScheduleFacade },
    ],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  const markets = TestBed.inject(MarketScheduleFacade) as FakeMarketScheduleFacade;
  return { view, storefront, catalogue, markets };
}

const completeStorefront: StorefrontView = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '',
  imageReference: 'v42/storefronts/acme/cover-photo',
  subdomain: null,
};

async function renderReady(overrides: Partial<StorefrontView> = {}) {
  const ctx = await renderDashboard();
  ctx.storefront.view.set({ ...completeStorefront, subdomain: 'acme', ...overrides });
  ctx.catalogue.items.set([aDish]);
  ctx.markets.schedules.set([aSchedule]);
  ctx.view.detectChanges();
  return ctx;
}

const aDish: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme/item-1',
};

const aSchedule: MarketScheduleView = {
  scheduleId: 'schedule-1',
  market: { id: 'market-1', name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
  frequency: { weeks: 1 },
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

  it('loads the schedules on arrival', async () => {
    const { markets } = await renderDashboard();
    expect(markets.loaded).toBe(true);
  });

  it('marks the markets step done and shows the count once schedules exist', async () => {
    const { view, markets } = await renderDashboard();
    markets.schedules.set([aSchedule]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /indiquez vos marchés/i });
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 marché ajouté')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the market count', async () => {
    const { view, markets } = await renderDashboard();
    markets.schedules.set([aSchedule, { ...aSchedule, scheduleId: 'schedule-2' }]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /indiquez vos marchés/i });
    expect(within(step).getByText('2 marchés ajoutés')).toBeInTheDocument();
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

  it('shows the storefront URL as a link once the vitrine is ready', async () => {
    await renderReady();

    expect(screen.getByText(/sera publiée à/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'acme.marketmiam.fr' });
    expect(link).toHaveAttribute('href', 'https://acme.marketmiam.fr');
  });

  it('publishes the storefront when Publier is clicked', async () => {
    const { storefront } = await renderReady();

    fireEvent.click(screen.getByRole('button', { name: 'Publier' }));

    expect(storefront.publishCalled).toBe(true);
  });

  it('disables the button and shows progress while publishing', async () => {
    const { storefront, view } = await renderReady();
    storefront.publishing.set(true);
    view.detectChanges();

    expect(screen.getByRole('button', { name: 'Publication…' })).toBeDisabled();
  });

  it('confirms and hides the button once published', async () => {
    const { storefront, view } = await renderReady();
    storefront.published.set(true);
    view.detectChanges();

    expect(screen.getByText('✓ Vitrine publiée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publier|publication/i })).not.toBeInTheDocument();
  });

  it('shows an error when publishing fails', async () => {
    const { storefront, view } = await renderReady();
    storefront.publishError.set(true);
    view.detectChanges();

    expect(screen.getByText(/la publication a échoué/i)).toBeInTheDocument();
  });

  it('explains the URL is pending and offers no button when no subdomain is assigned', async () => {
    await renderReady({ subdomain: null });

    expect(screen.getByText(/en cours d.attribution/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument();
  });
});
