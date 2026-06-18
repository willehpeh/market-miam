import { describe } from 'vitest';
import { InMemoryEventStore } from '../../in-memory.event-store';
import { AddItemToCatalogueHandler, Catalogues, NoSuchItemError, RetireItem, RetireItemHandler } from '@market-monster/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestRetireItem } from './test-data';

describe('Retire item', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: RetireItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(store);
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

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestRetireItem.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });
});
