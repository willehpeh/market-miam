import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorefrontFeed } from './storefront-feed';
import { CustomerStorefront } from './customer-storefront';
import { StorefrontViewModel, toViewModel } from './storefront-view-model';

const dto = (soldOutItemIds: string[], inProgress = true): CustomerStorefront => ({
  status: 'published',
  name: 'Acme Bakery',
  description: '',
  phone: '',
  coverPhoto: null,
  items: [],
  upcomingMarkets: [
    {
      date: '2026-08-15',
      weekday: 'SAT',
      marketName: 'Marché de la Croix-Rousse',
      startTime: '08:00',
      endTime: '13:00',
      postalCode: '69004',
      town: 'Lyon',
      cancelled: false,
      inProgress,
      items: [{ itemId: 'item-1', name: 'Bœuf bourguignon', description: '', price: 1300, imageReference: '' }],
      soldOutItemIds,
    },
  ],
});

const liveView = (): StorefrontViewModel => toViewModel(dto([]));

const isRefetch = (url: string) => url.endsWith('/api/public/storefront/acme');

describe('StorefrontFeed', () => {
  let feed: StorefrontFeed;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorefrontFeed, provideHttpClient(), provideHttpClientTesting()],
    });
    feed = TestBed.inject(StorefrontFeed);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  const becomeVisible = () => document.dispatchEvent(new Event('visibilitychange'));

  // The real behaviour is open, walk, pocket the phone, pull it out at the stall — the
  // visibility re-fetch is the one that earns its keep (decision 8).
  it('re-asks when the tab becomes visible while live', () => {
    feed.seed(liveView(), 'acme');

    becomeVisible();

    httpCtrl.expectOne(({ url }) => isRefetch(url)).flush(dto(['item-1']));
    const view = feed.view();
    expect(view?.status === 'published' && view.upcomingMarkets[0].items[0].soldOut).toBe(true);
  });

  it('sits still while the storefront is not broadcasting', () => {
    feed.seed(toViewModel(dto([], false)), 'acme');

    becomeVisible();

    httpCtrl.expectNone(({ url }) => isRefetch(url));
  });

  // Dropping the layout on a flaky market-hall tunnel would be a bigger lie than a stale
  // menu: failures keep the last view (decision 8).
  it('keeps the last view when a re-ask fails', () => {
    const seeded = liveView();
    feed.seed(seeded, 'acme');

    becomeVisible();
    httpCtrl.expectOne(({ url }) => isRefetch(url)).flush(null, { status: 500, statusText: 'Server Error' });

    expect(feed.view()).toEqual(seeded);
  });

  it('stays quiet while the tab is hidden', () => {
    feed.seed(liveView(), 'acme');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    document.dispatchEvent(new Event('visibilitychange'));

    httpCtrl.expectNone(({ url }) => isRefetch(url));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});
