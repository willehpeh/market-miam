import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorefrontHost } from '../core/storefront-host';
import { StorefrontFeed } from './storefront-feed';
import { CustomerStorefront, PublishedCustomerStorefront } from './customer-storefront';
import { UpcomingMarket } from './markets/upcoming-market';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';

// Running, with a menu — the shape the poll's gate holds over (decision 26).
const day = (overrides: Partial<UpcomingMarket> = {}): UpcomingMarket => ({
  date: '2026-08-15',
  weekday: 'SAT',
  marketName: 'Marché de la Croix-Rousse',
  startTime: '08:00',
  endTime: '13:00',
  postalCode: '69004',
  town: 'Lyon',
  cancelled: false,
  inProgress: true,
  items: [{ itemId: 'item-1', name: 'Bœuf bourguignon', description: '', price: 1300, imageReference: '' }],
  soldOutItemIds: [],
  ...overrides,
});

const dto = (...upcomingMarkets: UpcomingMarket[]): PublishedCustomerStorefront => ({
  status: 'published',
  name: 'Acme Bakery',
  description: '',
  phone: '',
  coverPhoto: null,
  cartePricesVisible: true,
  items: [],
  upcomingMarkets,
});

const isFetch = (url: string) => url.endsWith('/api/public/storefront/acme');

describe('StorefrontFeed', () => {
  let feed: StorefrontFeed;
  let httpCtrl: HttpTestingController;

  function createFeed(subdomain: string | null = 'acme'): void {
    TestBed.configureTestingModule({
      providers: [
        StorefrontFeed,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorefrontHost, useValue: { subdomain, origin: 'https://acme.marketmiam.fr' } },
      ],
    });
    feed = TestBed.inject(StorefrontFeed);
    httpCtrl = TestBed.inject(HttpTestingController);
    // The resource issues its request from an effect, so nothing is in flight until the
    // first tick.
    TestBed.tick();
  }

  // A resource settles its response through a microtask before the linkedSignal can see
  // it, so a flush is only observable on the far side of both that and a tick.
  const settled = async (): Promise<StorefrontViewModel | null> => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    return feed.view();
  };

  // reload() marks the resource; the request itself goes out on the next tick.
  const becomeVisible = () => {
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
  };

  // The poll's gate, driven the only way it is ever read: hand the feed a storefront, then
  // let the tab come back and see whether it re-asks.
  const sitsStillOver = async (storefront: CustomerStorefront): Promise<void> => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(storefront);
    await settled();

    becomeVisible();

    httpCtrl.expectNone(({ url }) => isFetch(url));
  };

  afterEach(() => {
    httpCtrl.verify();
  });

  // The feed owns its own fetch: no caller has to prime it, which is what lets the server
  // render wait for it.
  it('asks for the storefront named by the host', async () => {
    createFeed();

    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(day()));

    expect((await settled())?.status).toBe('published');
  });

  it('asks for nothing when the host names no vendor', async () => {
    createFeed(null);

    httpCtrl.expectNone(() => true);
    expect(await settled()).toBeNull();
  });

  // The real behaviour is open, walk, pocket the phone, pull it out at the stall — the
  // visibility re-fetch is the one that earns its keep (decision 8).
  it('re-asks when the tab becomes visible while live', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(day()));
    await settled();

    becomeVisible();

    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(day({ soldOutItemIds: ['item-1'] })));
    const refreshed = await settled();
    expect(refreshed?.status === 'published' && refreshed.upcomingMarkets[0].items[0].soldOut).toBe(true);
  });

  it('sits still before the market starts', () => sitsStillOver(dto(day({ inProgress: false }))));

  // A menu is what there is to re-ask for; without one the page keeps its normal face.
  it('sits still over an empty menu', () => sitsStillOver(dto(day({ items: [] }))));

  // The gate reads the featured day, the one the page leads with — a later market being
  // live is not this page's claim to make.
  it('sits still while only a later market is live', () =>
    sitsStillOver(dto(day({ inProgress: false, items: [] }), day())));

  it('sits still with no market days at all', () => sitsStillOver(dto()));

  it('sits still for a storefront that is not published', () =>
    sitsStillOver({ status: 'coming-soon', name: 'Acme Bakery' }));

  // Dropping the layout on a flaky market-hall tunnel would be a bigger lie than a stale
  // menu: failures keep the last view (decision 8).
  it('keeps the last view when a re-ask fails', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(day()));
    const first = await settled();

    becomeVisible();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(null, { status: 500, statusText: 'Server Error' });

    expect(await settled()).toEqual(first);
    expect(await settled()).toEqual(toViewModel(dto(day())));
  });

  it('stays quiet while the tab is hidden', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(day()));
    await settled();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    becomeVisible();

    httpCtrl.expectNone(({ url }) => isFetch(url));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});
