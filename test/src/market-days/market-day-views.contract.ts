import { beforeEach, describe, expect, it } from 'vitest';
import { MarketDayViews, MarketDayViewStore } from '@market-miam/market-days';

type Store = MarketDayViews & MarketDayViewStore;

const DAY = '2026-06-20';

export function marketDayViewsContract(name: string, create: () => Store): void {
  describe(`MarketDayViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    const menusOn = (vendorId: string, date: string) => store.menusFor(vendorId, date, date);

    it('reads nothing for a vendor who has planned no day at all', async () => {
      expect(await menusOn('v1', DAY)).toEqual([]);
    });

    it('records the menu a vendor set for a day', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1', 'item-2'] }, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        { marketId: 'market-1', date: DAY, itemIds: ['item-1', 'item-2'] },
      ]);
    });

    // A replay re-applies every MarketDayMenuSet for the day, so setting must replace
    // rather than accumulate — otherwise a rebuild multiplies the menu.
    it('replaces the menu when the day is set again', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-2', 'item-3'] }, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        { marketId: 'market-1', date: DAY, itemIds: ['item-2', 'item-3'] },
      ]);
    });

    // A day emptied on purpose still reads back — a vendor who cleared the menu said
    // something, unlike a day nobody ever touched, which is simply absent.
    it('keeps the day with an empty menu when it is set to nothing', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: [] }, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        { marketId: 'market-1', date: DAY, itemIds: [] },
      ]);
    });

    it('keeps menus apart by vendor and by date', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v1');

      expect(await menusOn('v2', DAY)).toEqual([]);
      expect(await menusOn('v1', '2026-06-27')).toEqual([]);
    });

    // The window is inclusive at both ends, matching Recurrence.occurrencesWithin — the
    // horizon date is a day the caller asked about, not one past it.
    it('reads a window of days, in date then market order, skipping days nobody planned', async () => {
      await store.setMenu({ marketId: 'market-2', date: DAY, itemIds: ['item-2'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: '2026-06-13', itemIds: ['item-3'] }, 'v1');
      await store.setMenu({ marketId: 'market-1', date: '2026-06-27', itemIds: ['item-4'] }, 'v1');

      expect(await store.menusFor('v1', DAY, '2026-06-27')).toEqual([
        { marketId: 'market-1', date: DAY, itemIds: ['item-1'] },
        { marketId: 'market-2', date: DAY, itemIds: ['item-2'] },
        { marketId: 'market-1', date: '2026-06-27', itemIds: ['item-4'] },
      ]);
    });

    it('reads no other vendor\'s menus in the window', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v2');

      expect(await store.menusFor('v1', DAY, '2026-06-27')).toEqual([]);
    });

    // Neither side shares array identity with the store: a caller mutating the menu it
    // handed in, or the one it read back, would otherwise reach into the store.
    it('does not share the menu array with callers', async () => {
      const written = { marketId: 'market-1', date: DAY, itemIds: ['item-1'] };
      await store.setMenu(written, 'v1');
      written.itemIds.push('smuggled-in');

      const [read] = await menusOn('v1', DAY);
      read.itemIds.push('smuggled-out');

      expect(await menusOn('v1', DAY)).toEqual([
        { marketId: 'market-1', date: DAY, itemIds: ['item-1'] },
      ]);
    });

    it('clears every menu', async () => {
      await store.setMenu({ marketId: 'market-1', date: DAY, itemIds: ['item-1'] }, 'v1');

      await store.clear();

      expect(await menusOn('v1', DAY)).toEqual([]);
    });
  });
}
