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

  it('rejects publishing a storefront whose description is empty', async () => {
    openStorefrontWithInformation({ description: '' });

    const failure = await handler.execute(TestPublishStorefront.valid()).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(StorefrontNotReadyToPublish);
    expect((failure as StorefrontNotReadyToPublish).missing).toContain('description');
    expect((failure as StorefrontNotReadyToPublish).missing).not.toContain('title');
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 }], { vendorId: 'vendor-id' });
  }

  function openStorefrontWithInformation(overrides: { name?: string; description?: string } = {}) {
    store.seedWith('storefront-vendor-id', [
      { type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 },
      {
        type: 'StorefrontInformationEdited',
        payload: { name: overrides.name ?? 'Chez Demo', description: overrides.description ?? 'Cuisine maison', phone: '0102030405' },
        version: 1,
      },
    ], { vendorId: 'vendor-id' });
  }
});
