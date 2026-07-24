import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, NoSuchItemError, ReviseItem, ReviseItemHandler } from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestReviseItem } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Revise item', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: ReviseItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ReviseItemHandler(catalogues);
  });

  it('should revise the name, description and price of an existing item', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);

    const command = new ReviseItem(newItemCommand.itemId, newItemCommand.vendorId, 'Revised Name', 'Revised Description', 750);
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRevised',
        payload: {
          itemId: command.itemId,
          name: 'Revised Name',
          description: 'Revised Description',
          price: 750
        }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await handler.execute(TestReviseItem.valid());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestReviseItem.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });
});
