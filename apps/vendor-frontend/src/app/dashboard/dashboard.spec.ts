import { screen, waitFor, within } from '@testing-library/angular';
import { DashboardPageObject } from './dashboard.page-object';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { CatalogueItemView } from '../catalogue/catalogue';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';
import { MarketScheduleView } from '../markets/market-schedules';
import { FakeMarketDayFacade } from '../market-days/fake.market-day.facade';
import { testMarketDayView } from '../market-days/test-market-day-view.builder';
import { FakeLegalIdentityFacade } from '../legal-identity/fake.legal-identity.facade';
import { LegalIdentityView } from '../legal-identity/legal-identity';
import { FakeShare } from '../core/fake.share';

const completeStorefront: StorefrontView = {
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '',
  imageReference: 'v42/storefronts/acme/cover-photo',
  subdomain: null,
  published: false,
  cartePricesVisible: true,
};

// A vendor who has filled nothing in.
const blankStorefront: StorefrontView = {
  name: '', description: '', phone: '', imageReference: '', subdomain: null, published: false, cartePricesVisible: true,
};

const aItem: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  allergens: ['gluten', 'milk'],
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

const anIdentity: LegalIdentityView = {
  siret: '73282932000074',
  legalName: 'Acme SARL',
  address: '1 rue du Pain, 69004 Lyon',
  contactEmail: 'contact@acme.fr',
  phone: '04 78 00 00 00',
  vatRegime: 'assujetti',
  mediatorName: null,
  mediatorUrl: null,
  legalForm: null,
  shareCapital: null,
  registryCity: null,
  legalRepresentative: null,
};

// The stores the setup steps read, for a test to deliver a vitrine through.
function fakeStores() {
  return {
    storefront: new FakeStorefrontFacade(),
    catalogue: new FakeCatalogueFacade(),
    markets: new FakeMarketScheduleFacade(),
    legalIdentity: new FakeLegalIdentityFacade(),
  };
}

// Every setup step done, as the stores answer once the dashboard has asked: a vitrine with
// its name, photo and address, a dish, a market and the mentions légales.
function deliverReady(
  { storefront, catalogue, markets, legalIdentity }: ReturnType<typeof fakeStores>,
  overrides: Partial<StorefrontView> = {},
) {
  storefront.view.set({ ...completeStorefront, subdomain: 'acme', ...overrides });
  catalogue.items.set([aItem]);
  markets.schedules.set([aSchedule]);
  legalIdentity.identity.set(anIdentity);
}

describe('Dashboard', () => {
  it('asks for the legal identity on arrival', async () => {
    const legalIdentity = new FakeLegalIdentityFacade();
    await DashboardPageObject.render({ legalIdentity });

    expect(legalIdentity.loadCalled).toBe(true);
  });

  // The prompt is a card that would otherwise pop in above everything a moment late.
  it('waits for the legal identity before showing anything', async () => {
    const storefront = new FakeStorefrontFacade();
    const legalIdentity = new FakeLegalIdentityFacade();
    const page = await DashboardPageObject.render({ storefront, legalIdentity });
    legalIdentity.loading.set(true);
    storefront.view.set({ ...completeStorefront, subdomain: 'acme', published: true });
    page.detectChanges();

    expect(page.loadingStatus()).toBeInTheDocument();
  });

  // A vendor published before the mentions légales existed never saw the setup steps that
  // now ask for them.
  it('asks for the mentions légales on the published home while none are provided', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();
    stores.legalIdentity.identity.set(null);
    page.detectChanges();

    expect(page.completeLegalIdentityLink()).toHaveAttribute('href', '/dashboard/legal-identity');
  });

  // The setup steps ask already; a card above them would say it twice.
  it('leaves asking to the setup steps before publication', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();
    stores.legalIdentity.identity.set(null);
    page.detectChanges();

    expect(page.queryCompleteLegalIdentityLink()).not.toBeInTheDocument();
  });

  it('leaves the mentions légales step to do until the vendor provides them', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();
    stores.legalIdentity.identity.set(null);
    page.detectChanges();

    expect(page.legalIdentityStep()).toHaveAttribute('href', '/dashboard/legal-identity');
    expect(screen.getByText('Obligatoires pour publier votre vitrine.')).toBeInTheDocument();
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '3');
  });

  // The API refuses to publish without them (slice 9 of the plan), so the button waits too.
  it('holds Publier back until the mentions légales are provided', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();
    stores.legalIdentity.identity.set(null);
    page.detectChanges();

    expect(page.queryPublishButton()).not.toBeInTheDocument();
  });

  it('marks the mentions légales step done once provided', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();

    expect(screen.getByText('Renseignées')).toBeInTheDocument();
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '4');
    expect(page.publishButton()).toBeInTheDocument();
  });

  it('stops asking once the mentions légales are provided', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();
    stores.legalIdentity.identity.set(anIdentity);
    page.detectChanges();

    expect(page.queryCompleteLegalIdentityLink()).not.toBeInTheDocument();
  });

  // Unknown is not missing: a failed load says nothing about the vendor.
  it('does not ask while the legal identity is unknown', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.queryCompleteLegalIdentityLink()).not.toBeInTheDocument();
  });

  it('opens the mentions légales from the published home', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.legalIdentityLink()).toHaveAttribute('href', '/dashboard/legal-identity');
  });

  it('waits for the storefront to arrive before showing steps or the published home', async () => {
    const page = await DashboardPageObject.render();

    expect(page.loadingStatus()).toBeInTheDocument();
    expect(page.queryProgressBar()).not.toBeInTheDocument();
    expect(page.queryAnyLink()).not.toBeInTheDocument();
  });

  it('leaves every setup step to do for a vendor who has filled nothing in', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set(blankStorefront);
    page.detectChanges();

    expect(page.storefrontStep()).toHaveAttribute('href', '/dashboard/information');
    expect(page.catalogueStep()).toHaveAttribute('href', '/dashboard/catalogue');
    expect(page.marketsStep()).toHaveAttribute('href', '/dashboard/markets');
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Manquants : nom, photo · Optionnels : description, téléphone')).toBeInTheDocument();
  });

  it('marks the storefront step done once name and photo are set', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set(completeStorefront);
    page.detectChanges();

    expect(screen.getByText('Renseignés : nom, description, photo · Optionnel : téléphone')).toBeInTheDocument();
    expect(page.storefrontStep()).toHaveAttribute('href', '/dashboard/information');
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '1');
    expect(page.catalogueStep()).toBeInTheDocument();
    expect(page.marketsStep()).toBeInTheDocument();
  });

  it('loads the catalogue on arrival', async () => {
    const catalogue = new FakeCatalogueFacade();
    await DashboardPageObject.render({ catalogue });
    expect(catalogue.loaded).toBe(true);
  });

  it('loads the schedules on arrival', async () => {
    const markets = new FakeMarketScheduleFacade();
    await DashboardPageObject.render({ markets });
    expect(markets.loaded).toBe(true);
  });

  // Warmed ahead of the gate, like the days above it: the prompt renders behind loaded(),
  // and loaded() waits on this very flag.
  it('asks for the unrated days on arrival, before the card that reads them', async () => {
    const marketDays = new FakeMarketDayFacade();
    await DashboardPageObject.render({ marketDays });

    expect(marketDays.loadedUnrated).toBe(1);
  });

  // The loop this pins: a load dispatched from inside loaded() flips loaded() false, which
  // destroys the card that dispatched it, which the response then re-creates — for ever,
  // since loadUnrated is deliberately ungated by freshness.
  it('asks once, however the loading flag turns over', async () => {
    const marketDays = new FakeMarketDayFacade();
    const page = await DashboardPageObject.render({ marketDays });
    marketDays.unratedLoading.set(true);
    page.detectChanges();
    marketDays.unratedLoading.set(false);
    page.detectChanges();

    expect(marketDays.loadedUnrated).toBe(1);
  });

  it('marks the markets step done and shows the count once schedules exist', async () => {
    const storefront = new FakeStorefrontFacade();
    const markets = new FakeMarketScheduleFacade();
    const page = await DashboardPageObject.render({ storefront, markets });
    storefront.view.set(blankStorefront);
    page.detectChanges();
    markets.schedules.set([aSchedule]);
    page.detectChanges();

    const step = page.marketsStep();
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 marché ajouté')).toBeInTheDocument();
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the market count', async () => {
    const storefront = new FakeStorefrontFacade();
    const markets = new FakeMarketScheduleFacade();
    const page = await DashboardPageObject.render({ storefront, markets });
    storefront.view.set(blankStorefront);
    page.detectChanges();
    markets.schedules.set([aSchedule, { ...aSchedule, scheduleId: 'schedule-2' }]);
    page.detectChanges();

    const step = page.marketsStep();
    expect(within(step).getByText('2 marchés ajoutés')).toBeInTheDocument();
  });

  it('marks the catalogue step done and shows the item count once items exist', async () => {
    const storefront = new FakeStorefrontFacade();
    const catalogue = new FakeCatalogueFacade();
    const page = await DashboardPageObject.render({ storefront, catalogue });
    storefront.view.set(blankStorefront);
    page.detectChanges();
    catalogue.items.set([aItem]);
    page.detectChanges();

    const step = page.catalogueStep();
    expect(within(step).getByText('✓')).toBeInTheDocument();
    expect(within(step).getByText('1 plat ajouté')).toBeInTheDocument();
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '1');
  });

  it('pluralises the item count', async () => {
    const storefront = new FakeStorefrontFacade();
    const catalogue = new FakeCatalogueFacade();
    const page = await DashboardPageObject.render({ storefront, catalogue });
    storefront.view.set(blankStorefront);
    page.detectChanges();
    catalogue.items.set([aItem, { ...aItem, itemId: 'item-2' }]);
    page.detectChanges();

    const step = page.catalogueStep();
    expect(within(step).getByText('2 plats ajoutés')).toBeInTheDocument();
  });

  it('leaves the catalogue step to do while it holds no items', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set(blankStorefront);
    page.detectChanges();

    const step = page.catalogueStep();
    expect(within(step).queryByText('✓')).not.toBeInTheDocument();
  });

  it('keeps the storefront step to do while the cover photo is missing', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set({ ...completeStorefront, imageReference: '' });
    page.detectChanges();

    expect(page.storefrontStep()).toHaveAttribute('href', '/dashboard/information');
    expect(page.progressBar()).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Renseignés : nom, description · Manquant : photo · Optionnel : téléphone')).toBeInTheDocument();
  });

  it('offers publication even when the optional description and phone are empty', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { description: '', phone: '' });
    page.detectChanges();

    expect(page.publishButton()).toBeInTheDocument();
    expect(screen.getByText('Renseignés : nom, photo · Optionnels : description, téléphone')).toBeInTheDocument();
  });

  it('shows the storefront URL as a link once the vitrine is ready', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();

    expect(screen.getByText(/sera publiée à/i)).toBeInTheDocument();
    const link = page.storefrontLink('acme.marketmiam.fr');
    expect(link).toHaveAttribute('href', 'https://acme.marketmiam.fr');
  });

  it('publishes the storefront when Publier is clicked', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();

    page.publish();

    expect(stores.storefront.publishCalled).toBe(true);
  });

  it('disables the button and shows progress while publishing', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();
    stores.storefront.publishing.set(true);
    page.detectChanges();

    expect(page.publishingButton()).toBeDisabled();
  });

  it('drops the setup steps once the vitrine is published', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.queryProgressBar()).not.toBeInTheDocument();
    expect(screen.queryByText(/terminez votre installation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/votre vitrine est prête/i)).not.toBeInTheDocument();
    expect(page.queryPublishButton()).not.toBeInTheDocument();
    expect(screen.getByText('Votre vitrine')).toBeInTheDocument();
  });

  it('offers the live storefront to the share sheet', async () => {
    const stores = fakeStores();
    const sharing = new FakeShare();
    const page = await DashboardPageObject.render({ ...stores, sharing });
    deliverReady(stores, { published: true });
    page.detectChanges();

    page.share();

    await waitFor(() => expect(sharing.offered).toEqual({ title: 'Acme Bakery', url: 'https://acme.marketmiam.fr' }));
    expect(screen.queryByText('Lien copié')).not.toBeInTheDocument();
  });

  it('confirms the copy, then returns to Partager, where there is no share sheet', async () => {
    const stores = fakeStores();
    const sharing = new FakeShare();
    const page = await DashboardPageObject.render({ ...stores, sharing });
    deliverReady(stores, { published: true });
    page.detectChanges();
    sharing.outcome = 'copied';

    page.share();

    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());
    await waitFor(() => expect(page.shareButton()).toBeInTheDocument());
  });

  // Each copy is its own receipt. The reset used to be a bare timer per tap, so a second
  // copy inherited the first one's deadline: tap again and the confirmation vanished half
  // a second later, exactly when a vendor is tapping because they doubt it worked.
  it('gives a second copy its own full confirmation window', async () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const stores = fakeStores();
    const sharing = new FakeShare();
    const page = await DashboardPageObject.render({ ...stores, sharing, copiedNoticeDelay: 300 });
    deliverReady(stores, { published: true });
    page.detectChanges();
    sharing.outcome = 'copied';

    page.share();
    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());

    await sleep(180);
    page.shareAgain();
    await waitFor(() => expect(screen.getByText('Lien copié')).toBeInTheDocument());

    // ~380ms after the first tap, ~200ms after the second: the first tap's deadline has
    // passed and must not take the second tap's receipt with it.
    await sleep(200);
    page.detectChanges();
    expect(screen.getByText('Lien copié')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Lien copié')).not.toBeInTheDocument());
    expect(page.shareButton()).toBeInTheDocument();
  });

  it('says nothing when the vendor backs out of the share sheet', async () => {
    const stores = fakeStores();
    const sharing = new FakeShare();
    const page = await DashboardPageObject.render({ ...stores, sharing });
    deliverReady(stores, { published: true });
    page.detectChanges();
    sharing.outcome = null;

    page.share();

    await waitFor(() => expect(sharing.offered).not.toBeNull());
    expect(screen.queryByText('Lien copié')).not.toBeInTheDocument();
  });

  it('offers the storefront as online once published', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(screen.getByText('Votre vitrine')).toBeInTheDocument();
    expect(page.editStorefrontLink()).toHaveAttribute('href', '/dashboard/information');
  });

  it('opens the catalogue and the markets straight from the published home', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.catalogueLink()).toHaveAttribute('href', '/dashboard/catalogue');
    expect(page.marketsLink()).toHaveAttribute('href', '/dashboard/markets');
  });

  it('leads to the QR code from the published home', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.qrCodeLink()).toHaveAttribute('href', '/dashboard/qr-code');
  });

  it('keeps the QR code off the setup home, where there is nothing to scan yet', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set(blankStorefront);
    page.detectChanges();

    expect(page.queryQrCodeLink()).not.toBeInTheDocument();
  });

  it('links to the live storefront once published', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    const link = page.storefrontLink('acme.marketmiam.fr');
    expect(link).toHaveAttribute('href', 'https://acme.marketmiam.fr');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows an error when publishing fails', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores);
    page.detectChanges();
    stores.storefront.publishError.set(true);
    page.detectChanges();

    expect(screen.getByText(/la publication a échoué/i)).toBeInTheDocument();
  });

  it('puts the next menu at the top of the published home', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.nextMarketHeading()).toBeInTheDocument();
  });

  // Sibling cards, so none of them is the page. Without a heading of its own the document
  // has two competing h1s and no name.
  it('gives the page one top-level heading, not one per card', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { published: true });
    page.detectChanges();

    expect(page.topLevelHeadings().map((heading) => heading.textContent))
      .toEqual(['Tableau de bord']);
  });

  it('keeps the next menu off the setup home, where there is no audience yet', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await DashboardPageObject.render({ storefront });
    storefront.view.set(blankStorefront);
    page.detectChanges();

    expect(page.queryNextMarketHeading()).not.toBeInTheDocument();
  });

  // The card's empty state is a warning. Painting it before the days land would be a false
  // alarm, so the whole dashboard waits rather than the card flashing. Days already in the
  // store get the same treatment: a refetch means they may be stale, so the spinner wins.
  it('waits for the market days before showing anything, even days it already holds', async () => {
    const storefront = new FakeStorefrontFacade();
    const marketDays = new FakeMarketDayFacade();
    const page = await DashboardPageObject.render({ storefront, marketDays });
    marketDays.loading.set(true);
    marketDays.days.set([testMarketDayView()]);
    storefront.view.set({ ...completeStorefront, subdomain: 'acme', published: true });
    page.detectChanges();

    expect(page.loadingStatus()).toBeInTheDocument();
    expect(screen.queryByText(/croix-rousse/i)).not.toBeInTheDocument();
  });

  it('explains the URL is pending and offers no button when no subdomain is assigned', async () => {
    const stores = fakeStores();
    const page = await DashboardPageObject.render(stores);
    deliverReady(stores, { subdomain: null });
    page.detectChanges();

    expect(screen.getByText(/en cours d.attribution/i)).toBeInTheDocument();
    expect(page.queryPublishButton()).not.toBeInTheDocument();
  });
});
