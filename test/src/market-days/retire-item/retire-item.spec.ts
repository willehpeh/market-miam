import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-monster/market-days';
import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, NoSuchItemError, RetireItem, RetireItemHandler } from '@market-monster/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestRetireItem } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Retire item', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: RetireItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new RetireItemHandler(catalogues);
  });

  it('should retire an existing item', async () => {
    const newItemCommand = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);

    const command = new RetireItem(newItemCommand.vendorId, newItemCommand.itemId);
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRetired',
        payload: {
          itemId: command.itemId
        }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    const newItemCommand = TestAddItemToCatalogue.valid();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await handler.execute(new RetireItem(newItemCommand.vendorId, newItemCommand.itemId));

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestRetireItem.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });
});
