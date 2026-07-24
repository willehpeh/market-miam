import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, ChangeItemPhoto, ChangeItemPhotoHandler, NoSuchItemError } from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestChangeItemPhoto } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Change item photo', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: ChangeItemPhotoHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ChangeItemPhotoHandler(catalogues);
  });

  it('should change the photo of an existing item', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);

    const command = new ChangeItemPhoto(newItemCommand.itemId, newItemCommand.vendorId, 'v9/dishes/vendor-id/item-id');
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemPhotoChanged',
        payload: {
          itemId: command.itemId,
          imageReference: 'v9/dishes/vendor-id/item-id'
        }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await handler.execute(TestChangeItemPhoto.valid());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestChangeItemPhoto.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });
});
