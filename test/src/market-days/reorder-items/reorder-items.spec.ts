import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  AddItemToCatalogueHandler,
  Catalogues,
  IncompleteReorderError,
  ReorderItems,
  ReorderItemsHandler,
  RetireItem,
  RetireItemHandler,
  VendorScopedEvents,
} from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';

describe('Reorder items', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: ReorderItemsHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ReorderItemsHandler(catalogues);
  });

  async function addItems(...itemIds: string[]): Promise<void> {
    for (const itemId of itemIds) {
      await new AddItemToCatalogueHandler(catalogues).execute(TestAddItemToCatalogue.with({ itemId }));
    }
  }

  it('records the order the vendor chose', async () => {
    await addItems('starter', 'main');

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'starter'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemsReordered', payload: { itemIds: ['main', 'starter'] } }),
    ]);
  });

  it('refuses an order that leaves an item out', async () => {
    await addItems('starter', 'main');

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main'] })))
      .rejects.toThrow(IncompleteReorderError);
  });

  it('refuses an order naming an item that is not in the catalogue', async () => {
    await addItems('starter', 'main');

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'dessert'] })))
      .rejects.toThrow(IncompleteReorderError);
  });

  it('asks only for the items left after a retirement', async () => {
    await addItems('starter', 'main', 'dessert');
    await new RetireItemHandler(catalogues).execute(new RetireItem('vendor-id', 'main'));

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['dessert', 'starter'] }));

    expect(store.newEvents()).toContainEqual(
      expect.objectContaining({ type: 'ItemsReordered', payload: { itemIds: ['dessert', 'starter'] } }),
    );
  });

  it('refuses an order naming a retired item', async () => {
    await addItems('starter', 'main');
    await new RetireItemHandler(catalogues).execute(new RetireItem('vendor-id', 'main'));

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['starter', 'main'] })))
      .rejects.toThrow(IncompleteReorderError);
  });
});
