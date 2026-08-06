import { beforeEach, describe, expect, it } from 'vitest';
import { MarketDayViews, MarketDayViewStore } from '@market-miam/market-days';

type Store = MarketDayViews & MarketDayViewStore;

export function marketDayViewsContract(name: string, create: () => Store): void {
  describe(`MarketDayViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has an empty menu for a day nobody planned', async () => {
      expect(await store.menuFor('v1', 'market-1', '2026-06-20')).toEqual({
        marketId: 'market-1',
        date: '2026-06-20',
        itemIds: [],
      });
    });

    it('records the menu a vendor set for a day', async () => {
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-1', 'item-2'] }, 'v1');

      expect(await store.menuFor('v1', 'market-1', '2026-06-20')).toEqual({
        marketId: 'market-1',
        date: '2026-06-20',
        itemIds: ['item-1', 'item-2'],
      });
    });

    // A replay re-applies every MarketDayMenuSet for the day, so setting must replace
    // rather than accumulate — otherwise a rebuild multiplies the menu.
    it('replaces the menu when the day is set again', async () => {
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-1'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-2', 'item-3'] }, 'v1');

      expect((await store.menuFor('v1', 'market-1', '2026-06-20')).itemIds).toEqual(['item-2', 'item-3']);
    });

    it('clears the day when the menu is set to nothing', async () => {
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-1'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: [] }, 'v1');

      expect((await store.menuFor('v1', 'market-1', '2026-06-20')).itemIds).toEqual([]);
    });

    it('keeps menus apart by vendor, market and date', async () => {
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-1'] }, 'v1');

      expect((await store.menuFor('v2', 'market-1', '2026-06-20')).itemIds).toEqual([]);
      expect((await store.menuFor('v1', 'market-2', '2026-06-20')).itemIds).toEqual([]);
      expect((await store.menuFor('v1', 'market-1', '2026-06-27')).itemIds).toEqual([]);
    });

    it('clears every menu', async () => {
      await store.setMenu({ marketId: 'market-1', date: '2026-06-20', itemIds: ['item-1'] }, 'v1');

      await store.clear();

      expect((await store.menuFor('v1', 'market-1', '2026-06-20')).itemIds).toEqual([]);
    });
  });
}
