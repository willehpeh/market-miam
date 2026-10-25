import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Catalogues,
  IncompleteReorderError,
  NoSuchItemError,
  ReorderItems,
  ReorderItemsHandler,
  VendorScopedEvents,
} from '@market-miam/market-days';
import { catalogueStream, itemAdded, itemRetired, itemsReordered } from '../catalogue-events';
import { VendorId } from '@market-miam/shared-kernel';

describe('Reorder Items', () => {
  let store: InMemoryEventStore;
  let given: (...history: DomainEvent[]) => void;
  let catalogues: Catalogues;
  let handler: ReorderItemsHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    given = (...history) => store.seedWith(catalogueStream(), history, { vendorId: 'vendor-id' });
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ReorderItemsHandler(catalogues);
  });

  it('records the order the vendor chose', async () => {
    given(itemAdded('starter'), itemAdded('main'));

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'starter'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemsReordered', payload: { itemIds: ['main', 'starter'] } }),
    ]);
  });

  // A re-statement, not a change: saving the reorder page untouched must not put a second
  // copy of the order in the log — the same stance setMenu and setMarketPrices take.
  it('raises nothing when the order is the one already recorded', async () => {
    given(itemAdded('starter'), itemAdded('main'), itemsReordered('main', 'starter'));

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'starter'] }));

    expect(store.newEvents()).toEqual([]);
  });

  // Before any reorder the order is the order of addition, which is what the carte shows
  // (catalogue view, ORDER BY seq) — so restating it is a re-statement too.
  it('raises nothing when the order is the one the items were added in', async () => {
    given(itemAdded('starter'), itemAdded('main'));

    await handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['starter', 'main'] }));

    expect(store.newEvents()).toEqual([]);
  });

  it('refuses an order that leaves an item out', async () => {
    given(itemAdded('starter'), itemAdded('main'));

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main'] })))
      .rejects.toThrow(IncompleteReorderError);
  });

  it('refuses an order naming an item that is not in the catalogue', async () => {
    given(itemAdded('starter'), itemAdded('main'));

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['main', 'dessert'] })))
      .rejects.toThrow(IncompleteReorderError);
  });

  it('asks only for the items left after a retirement', async () => {
    given(itemAdded('starter'), itemAdded('main'), itemAdded('dessert'), itemRetired('main'));

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
    given(itemsReordered('never-added'));

    await expect(catalogues.forVendor(new VendorId('vendor-id'))).rejects.toThrow(NoSuchItemError);
  });

  it('refuses an order naming a retired item', async () => {
    given(itemAdded('starter'), itemAdded('main'), itemRetired('main'));

    await expect(handler.execute(new ReorderItems({ vendorId: 'vendor-id', itemIds: ['starter', 'main'] })))
      .rejects.toThrow(IncompleteReorderError);
  });
});
