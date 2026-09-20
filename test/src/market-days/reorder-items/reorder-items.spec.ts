import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  AddItemToCatalogueHandler,
  Catalogues,
  IncompleteReorderError,
  NoSuchItemError,
  ReorderItems,
  ReorderItemsHandler,
  RetireItem,
  RetireItemHandler,
  VendorScopedEvents,
} from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { VendorId } from '@market-miam/shared-kernel';

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

  // A re-statement, not a change: saving the reorder page untouched must not put a second
  // copy of the order in the log — the same stance setMenu and setMarketPrices take.
  it('raises nothing when the order is the one already recorded', async () => {
    await addItems('starter', 'main');
    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'starter'] }));

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'starter'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemsReordered', payload: { itemIds: ['main', 'starter'] } }),
    ]);
  });

  // Before any reorder the order is the order of addition, which is what the carte shows
  // (catalogue view, ORDER BY seq) — so restating it is a re-statement too.
  it('raises nothing when the order is the one the items were added in', async () => {
    await addItems('starter', 'main');

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['starter', 'main'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
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

  // The command path cannot produce this — reorderItems refuses an order that names an item
  // the catalogue does not hold — so this is the rehydration guard, the one revise has: a
  // stream that orders an item it never added fails loudly rather than replaying to a
  // catalogue with a hole in its order.
  it('refuses to rehydrate a catalogue whose stream orders an item it never added', async () => {
    store.seedWith('catalogue-vendor-id', [{
      type: 'ItemsReordered',
      payload: { itemIds: ['never-added'] },
      version: 1,
    }], { vendorId: 'vendor-id' });

    await expect(catalogues.forVendor(new VendorId('vendor-id'))).rejects.toThrow(NoSuchItemError);
  });

  it('refuses an order naming a retired item', async () => {
    await addItems('starter', 'main');
    await new RetireItemHandler(catalogues).execute(new RetireItem('vendor-id', 'main'));

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['starter', 'main'] })))
      .rejects.toThrow(IncompleteReorderError);
  });
});
