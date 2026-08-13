import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogueViewItem, CatalogueViews, CatalogueViewStore } from '@market-miam/market-days';

type Store = CatalogueViews & CatalogueViewStore;

const item = (overrides: Partial<CatalogueViewItem> = {}): CatalogueViewItem => ({
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/item-1',
  ...overrides,
});

export function catalogueViewsContract(name: string, create: () => Store): void {
  describe(`CatalogueViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has an empty catalogue for an unknown vendor', async () => {
      expect(await store.forVendor('nobody')).toEqual({ items: [] });
    });

    it('adds an item to the catalogue', async () => {
      await store.addItemToCatalogue(item(), 'v1');
      expect(await store.forVendor('v1')).toEqual({ items: [item()] });
    });

    it('round-trips a variant item (variants, no price)', async () => {
      const variantItem: CatalogueViewItem = {
        itemId: 'pizza',
        name: 'Pizza',
        description: 'Wood-fired',
        imageReference: 'v1/dishes/pizza',
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: 'spicy', price: 1200 },
        ],
      };
      await store.addItemToCatalogue(variantItem, 'v1');
      expect(await store.forVendor('v1')).toEqual({ items: [variantItem] });
    });

    // A rebuild replays every ItemAddedToCatalogue onto the store, so re-adding must
    // replace rather than append — otherwise a replay duplicates the whole catalogue.
    it('replaces a re-added item in place', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'Renamed' }), 'v1');

      const { items } = await store.forVendor('v1');
      expect(items.map(item => item.itemId)).toEqual(['a', 'b']);
      expect(items[0].name).toBe('Renamed');
    });

    it('keeps items in the order they were added', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'A' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b', name: 'B' }), 'v1');
      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['a', 'b']);
    });

    it('reorders the items into the order given', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'A' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b', name: 'B' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'c', name: 'C' }), 'v1');

      await store.reorderItems(['c', 'a', 'b'], 'v1');

      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['c', 'a', 'b']);
    });

    it('adds an item after a reorder to the end of the order', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'A' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b', name: 'B' }), 'v1');
      await store.reorderItems(['b', 'a'], 'v1');

      await store.addItemToCatalogue(item({ itemId: 'c', name: 'C' }), 'v1');

      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['b', 'a', 'c']);
    });

    it('leaves another vendor\'s order alone when reordering', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'A' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b', name: 'B' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'a', name: 'A' }), 'v2');
      await store.addItemToCatalogue(item({ itemId: 'b', name: 'B' }), 'v2');

      await store.reorderItems(['b', 'a'], 'v1');

      expect((await store.forVendor('v2')).items.map(item => item.itemId)).toEqual(['a', 'b']);
    });

    it('scopes items to their vendor', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a' }), 'v1');
      expect(await store.forVendor('v2')).toEqual({ items: [] });
    });

    it('revises an item name, description and price, keeping its image', async () => {
      await store.addItemToCatalogue(item(), 'v1');
      await store.reviseItem('item-1', { name: 'Poulet rôti', description: 'Fermier', price: 1600 }, 'v1');
      expect(await store.forVendor('v1')).toEqual({
        items: [item({ name: 'Poulet rôti', description: 'Fermier', price: 1600 })],
      });
    });

    it('revises a flat item into a variant item, clearing the price', async () => {
      await store.addItemToCatalogue(item(), 'v1');
      await store.reviseItem('item-1', {
        name: 'Pizza',
        description: 'Wood-fired',
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: 'spicy', price: 1200 },
        ],
      }, 'v1');
      expect(await store.forVendor('v1')).toEqual({
        items: [{
          itemId: 'item-1',
          name: 'Pizza',
          description: 'Wood-fired',
          imageReference: 'v1/dishes/item-1',
          variants: [
            { name: 'Margherita', description: '', price: 900 },
            { name: 'Pepperoni', description: 'spicy', price: 1200 },
          ],
        }],
      });
    });

    it('revises a variant item back to a single price, clearing the variants', async () => {
      await store.addItemToCatalogue({
        itemId: 'pizza',
        name: 'Pizza',
        description: 'Wood-fired',
        imageReference: 'v1/dishes/pizza',
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: 'spicy', price: 1200 },
        ],
      }, 'v1');
      await store.reviseItem('pizza', { name: 'Calzone', description: 'Folded', price: 1100 }, 'v1');
      expect(await store.forVendor('v1')).toEqual({
        items: [{
          itemId: 'pizza',
          name: 'Calzone',
          description: 'Folded',
          price: 1100,
          imageReference: 'v1/dishes/pizza',
        }],
      });
    });

    it('changes an item photo, keeping its other fields', async () => {
      await store.addItemToCatalogue(item(), 'v1');
      await store.updateItemPhoto('item-1', 'v9/dishes/item-1', 'v1');
      expect(await store.forVendor('v1')).toEqual({
        items: [item({ imageReference: 'v9/dishes/item-1' })],
      });
    });

    it('retires an item', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b' }), 'v1');
      await store.retireItem('a', 'v1');
      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['b']);
    });

    it('reorders the items left after a retirement', async () => {
      await store.addItemToCatalogue(item({ itemId: 'a' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'b' }), 'v1');
      await store.addItemToCatalogue(item({ itemId: 'c' }), 'v1');
      await store.retireItem('b', 'v1');

      await store.reorderItems(['c', 'a'], 'v1');

      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['c', 'a']);
    });

    it('clears all items', async () => {
      await store.addItemToCatalogue(item(), 'v1');
      await store.clear();
      expect(await store.forVendor('v1')).toEqual({ items: [] });
    });
  });
}
