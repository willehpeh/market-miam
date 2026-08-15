import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorefrontHost } from '../core/storefront-host';
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

  afterEach(() => {
    httpCtrl.verify();
  });

  // The feed owns its own fetch: no caller has to prime it, which is what lets the server
  // render wait for it.
  it('asks for the storefront named by the host', async () => {
    createFeed();

    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto([]));

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
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto([]));
    await settled();

    becomeVisible();

    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto(['item-1']));
    const refreshed = await settled();
    expect(refreshed?.status === 'published' && refreshed.upcomingMarkets[0].items[0].soldOut).toBe(true);
  });

  it('sits still while the storefront is not broadcasting', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto([], false));
    await settled();

    becomeVisible();

    httpCtrl.expectNone(({ url }) => isFetch(url));
  });

  // Dropping the layout on a flaky market-hall tunnel would be a bigger lie than a stale
  // menu: failures keep the last view (decision 8).
  it('keeps the last view when a re-ask fails', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto([]));
    const first = await settled();

    becomeVisible();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(null, { status: 500, statusText: 'Server Error' });

    expect(await settled()).toEqual(first);
    expect(await settled()).toEqual(toViewModel(dto([])));
  });

  it('stays quiet while the tab is hidden', async () => {
    createFeed();
    httpCtrl.expectOne(({ url }) => isFetch(url)).flush(dto([]));
    await settled();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    becomeVisible();

    httpCtrl.expectNone(({ url }) => isFetch(url));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});
