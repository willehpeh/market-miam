import { InMemoryEventStore } from '../../in-memory.event-store';
import { SetStorefrontCoverPhotoHandler, StoreFronts } from '@market-monster/market-days';
import { TestSetStorefrontCoverPhoto } from './test-data';

describe('Set Storefront Cover Photo', () => {
  let store: InMemoryEventStore;
  let storefronts: StoreFronts;
  let handler: SetStorefrontCoverPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new StoreFronts(store);
    handler = new SetStorefrontCoverPhotoHandler(storefronts);
  });

  it('should set the cover photo for the given vendor', async () => {
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
});
