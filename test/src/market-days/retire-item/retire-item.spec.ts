import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, RetireItem, RetireItemHandler } from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestRetireItem } from './test-data';

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
    const newItemCommand = TestAddItemToCatalogue.simple();
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

  it('should raise no events for an item it has never heard of', async () => {
    await handler.execute(TestRetireItem.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('should raise no second event when the item is already retired', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    const command = new RetireItem(newItemCommand.vendorId, newItemCommand.itemId);
    await handler.execute(command);

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemRetired' }),
    ]);
  });
});
