import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { SetStorefrontCoverPhotoHandler, StorefrontNotOpenError, Storefronts } from '@market-monster/market-days';
import { TestSetStorefrontCoverPhoto } from './test-data';

describe('Set Storefront Cover Photo', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: SetStorefrontCoverPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(store);
    handler = new SetStorefrontCoverPhotoHandler(storefronts);
  });

  it('rejects setting a cover photo on a storefront that has not been opened', async () => {
    await expect(handler.execute(TestSetStorefrontCoverPhoto.valid())).rejects.toThrow(StorefrontNotOpenError);
  });

  it('should set the cover photo for the given vendor', async () => {
    openStorefront();
    const command = TestSetStorefrontCoverPhoto.valid();
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'StorefrontCoverPhotoSet',
      payload: {
        imageReference: command.imageReference
      }
    })]);
  });

  it('should change the existing cover photo when a new one is set', async () => {
    openStorefront();
    const first = TestSetStorefrontCoverPhoto.valid();
    const second = TestSetStorefrontCoverPhoto.with({ imageReference: 'random/new-image-reference' });

    await handler.execute(first);
    await handler.execute(second);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'StorefrontCoverPhotoSet',
        payload: {
          imageReference: first.imageReference
        }
      }),
      expect.objectContaining({
        type: 'StorefrontCoverPhotoSet',
        payload: {
          imageReference: second.imageReference
        }
      })
    ]);
  });

  it('should do nothing if the same image is submitted', async () => {
    openStorefront();
    const command = TestSetStorefrontCoverPhoto.valid();
    await handler.execute(command);
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'StorefrontCoverPhotoSet',
      payload: {
        imageReference: command.imageReference
      }
    })]);
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' } }], { vendorId: 'vendor-id' });
  }
});
