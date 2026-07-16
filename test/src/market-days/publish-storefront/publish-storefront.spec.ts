import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { PublishStorefrontHandler, StorefrontNotReadyToPublish, StorefrontPublication, Storefronts } from '@market-miam/market-days';
import { TestPublishStorefront } from './test-data';

describe('Publish Storefront', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: PublishStorefrontHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(new VendorScopedEvents(store));
    handler = new PublishStorefrontHandler(storefronts, new StorefrontPublication());
  });

  it('rejects publishing a storefront that is not ready', async () => {
    openStorefront();

    await expect(handler.execute(TestPublishStorefront.valid())).rejects.toThrow(StorefrontNotReadyToPublish);
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 }], { vendorId: 'vendor-id' });
  }
});
