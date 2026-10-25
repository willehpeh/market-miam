import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Catalogues, ChangeItemPhoto, ChangeItemPhotoHandler, NoSuchItemError } from '@market-miam/market-days';
import { catalogueStream, itemAdded } from '../catalogue-events';
import { TestChangeItemPhoto } from './test-data';

describe('Change Item Photo', () => {
  let store: InMemoryEventStore;
  let given: (...history: DomainEvent[]) => void;
  let handler: ChangeItemPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    given = (...history) => store.seedWith(catalogueStream(), history, { vendorId: 'vendor-id' });
    handler = new ChangeItemPhotoHandler(new Catalogues(new VendorScopedEvents(store)));
  });

  it('should change the photo of an existing item', async () => {
    given(itemAdded());

    const command = new ChangeItemPhoto('item-id', 'vendor-id', 'v9/dishes/vendor-id/item-id');
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemPhotoChanged',
        payload: {
          itemId: command.itemId,
          imageReference: 'v9/dishes/vendor-id/item-id'
        }
      })
    ]);
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestChangeItemPhoto.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });
});
