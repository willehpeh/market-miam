import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogueViewItem, CatalogueViews, CatalogueViewStore } from '@market-miam/market-days';

type Store = CatalogueViews & CatalogueViewStore;

const dish = (overrides: Partial<CatalogueViewItem> = {}): CatalogueViewItem => ({
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
      await store.addItemToCatalogue(dish(), 'v1');
      expect(await store.forVendor('v1')).toEqual({ items: [dish()] });
    });

    it('keeps items in the order they were added', async () => {
      await store.addItemToCatalogue(dish({ itemId: 'a', name: 'A' }), 'v1');
      await store.addItemToCatalogue(dish({ itemId: 'b', name: 'B' }), 'v1');
      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['a', 'b']);
    });

    it('scopes items to their vendor', async () => {
      await store.addItemToCatalogue(dish({ itemId: 'a' }), 'v1');
      expect(await store.forVendor('v2')).toEqual({ items: [] });
    });

    it('updates an item price', async () => {
      await store.addItemToCatalogue(dish(), 'v1');
      await store.updateItemPrice('item-1', 1500, 'v1');
      expect((await store.forVendor('v1')).items[0].price).toBe(1500);
    });

    it('revises an item name, description and price, keeping its image', async () => {
      await store.addItemToCatalogue(dish(), 'v1');
      await store.reviseItem('item-1', { name: 'Poulet rôti', description: 'Fermier', price: 1600 }, 'v1');
      expect(await store.forVendor('v1')).toEqual({
        items: [dish({ name: 'Poulet rôti', description: 'Fermier', price: 1600 })],
      });
    });

    it('retires an item', async () => {
      await store.addItemToCatalogue(dish({ itemId: 'a' }), 'v1');
      await store.addItemToCatalogue(dish({ itemId: 'b' }), 'v1');
      await store.retireItem('a', 'v1');
      expect((await store.forVendor('v1')).items.map(item => item.itemId)).toEqual(['b']);
    });

    it('clears all items', async () => {
      await store.addItemToCatalogue(dish(), 'v1');
      await store.clear();
      expect(await store.forVendor('v1')).toEqual({ items: [] });
    });
  });
}
