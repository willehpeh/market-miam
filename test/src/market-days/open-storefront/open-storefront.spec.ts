import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { OpenStorefrontHandler, Storefronts } from '@market-monster/market-days';
import { TestOpenStorefront } from './test-data';

describe('Open Storefront', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: OpenStorefrontHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(store);
    handler = new OpenStorefrontHandler(storefronts);
  });

  it('opens an empty storefront for the vendor', async () => {
    await handler.execute(TestOpenStorefront.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'StorefrontOpened',
        payload: { vendorId: 'vendor-id' },
      }),
    ]);
  });

  it('is idempotent, ignoring a second open of the same storefront', async () => {
    await handler.execute(TestOpenStorefront.valid());
    await handler.execute(TestOpenStorefront.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'StorefrontOpened',
        payload: { vendorId: 'vendor-id' },
      }),
    ]);
  });
});
