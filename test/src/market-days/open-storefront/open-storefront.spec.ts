import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { OpenStorefrontHandler, Storefronts } from '@market-miam/market-days';
import { TestOpenStorefront } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Open Storefront', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: OpenStorefrontHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(new VendorScopedEvents(store));
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

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(TestOpenStorefront.valid());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
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
