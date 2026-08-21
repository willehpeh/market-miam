import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
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
import { MarketDayFacade } from '../market-days/market-day.facade';
import { FakeMarketDayFacade } from '../market-days/fake.market-day.facade';
import { marketDayView } from '../market-days/market-day-view.builder';
import { COPIED_NOTICE_DELAY, Share } from '../core/share';
import { FakeShare } from '../core/fake.share';

async function renderDashboard(copiedNoticeDelay = 0) {
  const view = await render(Dashboard, {
    providers: [
      provideRouter([]),
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: CatalogueFacade, useClass: FakeCatalogueFacade },
      { provide: MarketScheduleFacade, useClass: FakeMarketScheduleFacade },
      { provide: MarketDayFacade, useClass: FakeMarketDayFacade },
      { provide: Share, useClass: FakeShare },
      { provide: COPIED_NOTICE_DELAY, useValue: copiedNoticeDelay },
    ],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  const markets = TestBed.inject(MarketScheduleFacade) as FakeMarketScheduleFacade;
  const marketDays = TestBed.inject(MarketDayFacade) as FakeMarketDayFacade;
  const sharing = TestBed.inject(Share) as FakeShare;
  return { view, storefront, catalogue, markets, marketDays, sharing };
}

const completeStorefront: StorefrontView = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '',
  imageReference: 'v42/storefronts/acme/cover-photo',
  subdomain: null,
  published: false,
};

async function renderBlank() {
  const ctx = await renderDashboard();
  ctx.storefront.view.set({ name: '', description: '', phone: '', imageReference: '', subdomain: null, published: false });
  ctx.view.detectChanges();
  return ctx;
}

async function renderReady(overrides: Partial<StorefrontView> = {}, copiedNoticeDelay = 0) {
  const ctx = await renderDashboard(copiedNoticeDelay);
  ctx.storefront.view.set({ ...completeStorefront, subdomain: 'acme', ...overrides });
  ctx.catalogue.items.set([aItem]);
  ctx.markets.schedules.set([aSchedule]);
  ctx.view.detectChanges();
  return ctx;
}

const aItem: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/items/acme/item-1',
};

const aSchedule: MarketScheduleView = {
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  market: { name: 'Marché de la Croix-Rousse', codePostal: '69004', town: 'Lyon' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
  frequency: { weeks: 1 },
};

describe('Dashboard', () => {
  it('waits for the storefront to arrive before showing steps or the published home', async () => {
    await renderDashboard();

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves every setup step to do for a vendor who has filled nothing in', async () => {
    await renderBlank();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/dashboard/information');
    expect(screen.getByRole('link', { name: /composez votre catalogue/i })).toHaveAttribute('href', '/dashboard/catalogue');
    expect(screen.getByRole('link', { name: /indiquez vos marchés/i })).toHaveAttribute('href', '/dashboard/markets');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Manquants : nom, photo · Optionnels : description, téléphone')).toBeInTheDocument();
  });

  it('marks the storefront step done once name and photo are set', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set(completeStorefront);
    view.detectChanges();

    expect(screen.getByText('Renseignés : nom, description, photo · Optionnel : téléphone')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/dashboard/information');
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

  // Warmed ahead of the gate, like the days above it: the prompt renders behind loaded(),
  // and loaded() waits on this very flag.
  it('asks for the unrated days on arrival, before the card that reads them', async () => {
    const { marketDays } = await renderDashboard();

    expect(marketDays.loadedUnrated).toBe(1);
  });

  // The loop this pins: a load dispatched from inside loaded() flips loaded() false, which
  // destroys the card that dispatched it, which the response then re-creates — for ever,
  // since loadUnrated is deliberately ungated by freshness.
  it('asks once, however the loading flag turns over', async () => {
    const { marketDays, view } = await renderDashboard();
    marketDays.unratedLoading.set(true);
    view.detectChanges();
    marketDays.unratedLoading.set(false);
    view.detectChanges();

    expect(marketDays.loadedUnrated).toBe(1);
  });

  it('marks the markets step done and shows the count once schedules exist', async () => {
    const { view, markets } = await renderBlank();
    markets.schedules.set([aSchedule]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /indiquez vos marchés/i });
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 marché ajouté')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the market count', async () => {
    const { view, markets } = await renderBlank();
    markets.schedules.set([aSchedule, { ...aSchedule, scheduleId: 'schedule-2' }]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /indiquez vos marchés/i });
    expect(within(step).getByText('2 marchés ajoutés')).toBeInTheDocument();
  });

  it('marks the catalogue step done and shows the item count once items exist', async () => {
    const { view, catalogue } = await renderBlank();
    catalogue.items.set([aItem]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 plat ajouté')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the item count', async () => {
    const { view, catalogue } = await renderBlank();
    catalogue.items.set([aItem, { ...aItem, itemId: 'item-2' }]);
    view.detectChanges();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).getByText('2 plats ajoutés')).toBeInTheDocument();
  });

  it('leaves the catalogue step to do while it holds no items', async () => {
    await renderBlank();

    const step = screen.getByRole('link', { name: /composez votre catalogue/i });
    expect(within(step).queryByText('✓')).not.toBeInTheDocument();
  });

  it('keeps the storefront step to do while the cover photo is missing', async () => {
    const { view, storefront } = await renderDashboard();
    storefront.view.set({ ...completeStorefront, imageReference: '' });
    view.detectChanges();

    expect(screen.getByRole('link', { name: /informations de la vitrine/i })).toHaveAttribute('href', '/dashboard/information');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Renseignés : nom, description · Manquant : photo · Optionnel : téléphone')).toBeInTheDocument();
  });

  it('offers publication even when the optional description and phone are empty', async () => {
    await renderReady({ description: '', phone: '' });

    expect(screen.getByRole('button', { name: 'Publier' })).toBeInTheDocument();
    expect(screen.getByText('Renseignés : nom, photo · Optionnels : description, téléphone')).toBeInTheDocument();
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

  it('drops the setup steps once the vitrine is published', async () => {
    await renderReady({ published: true });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/terminez votre installation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/votre vitrine est prête/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publier|publication/i })).not.toBeInTheDocument();
    expect(screen.getByText('Votre vitrine')).toBeInTheDocument();
  });

  it('offers the live storefront to the share sheet', async () => {
    const { sharing } = await renderReady({ published: true });

    fireEvent.click(screen.getByRole('button', { name: /partager/i }));

    await waitFor(() => expect(sharing.offered).toEqual({ title: 'Acme Bakery', url: 'https://acme.marketmiam.fr' }));
    expect(screen.queryByText('Lien copié')).not.toBeInTheDocument();
  });

  it('confirms the copy, then returns to Partager, where there is no share sheet', async () => {
    const { sharing } = await renderReady({ published: true });
    sharing.outcome = 'copied';

    fireEvent.click(screen.getByRole('button', { name: /partager/i }));

    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument());
  });

  // Each copy is its own receipt. The reset used to be a bare timer per tap, so a second
  // copy inherited the first one's deadline: tap again and the confirmation vanished half
  // a second later, exactly when a vendor is tapping because they doubt it worked.
  it('gives a second copy its own full confirmation window', async () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const { view, sharing } = await renderReady({ published: true }, 300);
    sharing.outcome = 'copied';

    fireEvent.click(screen.getByRole('button', { name: /partager/i }));
    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());

    await sleep(180);
    fireEvent.click(screen.getByRole('button', { name: /lien copié/i }));
    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());

    // ~380ms after the first tap, ~200ms after the second: the first tap's deadline has
    // passed and must not take the second tap's receipt with it.
    await sleep(200);
    view.detectChanges();
    expect(screen.getByText('Lien copié')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Lien copié')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument();
  });

  it('says nothing when the vendor backs out of the share sheet', async () => {
    const { sharing } = await renderReady({ published: true });
    sharing.outcome = null;

    fireEvent.click(screen.getByRole('button', { name: /partager/i }));

    await waitFor(() => expect(sharing.offered).not.toBeNull());
    expect(screen.queryByText('Lien copié')).not.toBeInTheDocument();
  });

  it('offers the storefront as online once published', async () => {
    await renderReady({ published: true });

    expect(screen.getByText('Votre vitrine')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /modifier/i })).toHaveAttribute('href', '/dashboard/information');
  });

  it('opens the catalogue and the markets straight from the published home', async () => {
    await renderReady({ published: true });

    expect(screen.getByRole('link', { name: 'Votre catalogue' })).toHaveAttribute('href', '/dashboard/catalogue');
    expect(screen.getByRole('link', { name: 'Vos marchés' })).toHaveAttribute('href', '/dashboard/markets');
  });

  it('links to the live storefront once published', async () => {
    await renderReady({ published: true });

    const link = screen.getByRole('link', { name: 'acme.marketmiam.fr' });
    expect(link).toHaveAttribute('href', 'https://acme.marketmiam.fr');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows an error when publishing fails', async () => {
    const { storefront, view } = await renderReady();
    storefront.publishError.set(true);
    view.detectChanges();

    expect(screen.getByText(/la publication a échoué/i)).toBeInTheDocument();
  });

  it('puts the next menu at the top of the published home', async () => {
    await renderReady({ published: true });

    expect(screen.getByRole('heading', { name: /prochain marché/i })).toBeInTheDocument();
  });

  // Sibling cards, so none of them is the page. Without a heading of its own the document
  // has two competing h1s and no name.
  it('gives the page one top-level heading, not one per card', async () => {
    await renderReady({ published: true });

    expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent))
      .toEqual(['Tableau de bord']);
  });

  it('keeps the next menu off the setup home, where there is no audience yet', async () => {
    await renderBlank();

    expect(screen.queryByRole('heading', { name: /prochain marché/i })).not.toBeInTheDocument();
  });

  // The card's empty state is a warning. Painting it before the days land would be a false
  // alarm, so the whole dashboard waits rather than the card flashing. Days already in the
  // store get the same treatment: a refetch means they may be stale, so the spinner wins.
  it('waits for the market days before showing anything, even days it already holds', async () => {
    const { storefront, marketDays, view } = await renderDashboard();
    marketDays.loading.set(true);
    marketDays.days.set([marketDayView()]);
    storefront.view.set({ ...completeStorefront, subdomain: 'acme', published: true });
    view.detectChanges();

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    expect(screen.queryByText(/croix-rousse/i)).not.toBeInTheDocument();
  });

  it('explains the URL is pending and offers no button when no subdomain is assigned', async () => {
    await renderReady({ subdomain: null });

    expect(screen.getByText(/en cours d.attribution/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument();
  });
});
