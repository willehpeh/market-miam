import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { Calendars, Catalogues, PublishStorefrontHandler, StorefrontNotReadyToPublish, StorefrontPublication, Storefronts } from '@market-miam/market-days';
import { TestPublishStorefront } from './test-data';

describe('Publish Storefront', () => {
  let store: InMemoryEventStore;
  let handler: PublishStorefrontHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    handler = new PublishStorefrontHandler(new Storefronts(events), new Catalogues(events), new Calendars(events), new StorefrontPublication());
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

  it('rejects publishing a storefront without a cover photo', async () => {
    openStorefrontWithInformation();

    const failure = await handler.execute(TestPublishStorefront.valid()).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(StorefrontNotReadyToPublish);
    expect((failure as StorefrontNotReadyToPublish).missing).toContain('cover');
    expect((failure as StorefrontNotReadyToPublish).missing).not.toContain('description');
  });

  it('rejects publishing a storefront with no dishes', async () => {
    openStorefrontWithCover();

    const failure = await handler.execute(TestPublishStorefront.valid()).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(StorefrontNotReadyToPublish);
    expect((failure as StorefrontNotReadyToPublish).missing).toContain('catalogue');
    expect((failure as StorefrontNotReadyToPublish).missing).not.toContain('cover');
  });

  it('rejects publishing a storefront with no market schedule', async () => {
    openStorefrontWithCover();
    addDish();

    const failure = await handler.execute(TestPublishStorefront.valid()).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(StorefrontNotReadyToPublish);
    expect((failure as StorefrontNotReadyToPublish).missing).toContain('schedule');
    expect((failure as StorefrontNotReadyToPublish).missing).not.toContain('catalogue');
  });

  function addDish() {
    store.seedWith('catalogue-vendor-id', [
      { type: 'ItemAddedToCatalogue', payload: { itemId: 'dish-1', name: 'Bœuf bourguignon', description: 'Mijoté', price: 1300 }, version: 1 },
    ], { vendorId: 'vendor-id' });
  }

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

  function openStorefrontWithCover() {
    store.seedWith('storefront-vendor-id', [
      { type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 },
      { type: 'StorefrontInformationEdited', payload: { name: 'Chez Demo', description: 'Cuisine maison', phone: '0102030405' }, version: 1 },
      { type: 'StorefrontCoverPhotoSet', payload: { imageReference: 'v1/cover' }, version: 1 },
    ], { vendorId: 'vendor-id' });
  }
});
