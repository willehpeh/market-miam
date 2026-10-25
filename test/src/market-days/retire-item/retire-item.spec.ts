import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Catalogues, RetireItem, RetireItemHandler } from '@market-miam/market-days';
import { catalogueStream, itemAdded, itemRetired } from '../catalogue-events';
import { TestRetireItem } from './test-data';

describe('Retire Item', () => {
  let store: InMemoryEventStore;
  let given: (...history: DomainEvent[]) => void;
  let handler: RetireItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    given = (...history) => store.seedWith(catalogueStream(), history, { vendorId: 'vendor-id' });
    handler = new RetireItemHandler(new Catalogues(new VendorScopedEvents(store)));
  });

  it('should retire an existing item', async () => {
    given(itemAdded());

    const command = new RetireItem('vendor-id', 'item-id');
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
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
    given(itemAdded(), itemRetired());

    await handler.execute(new RetireItem('vendor-id', 'item-id'));

    expect(store.newEvents()).toEqual([]);
  });
});
