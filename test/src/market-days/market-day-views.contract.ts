import { beforeEach, describe, expect, it } from 'vitest';
import {
  AvailabilityMark,
  MarketDayMenu,
  MarketDayRef,
  MarketDayView,
  MarketDayViews,
  MarketDayViewStore
} from '@market-miam/market-days';

type Store = MarketDayViews & MarketDayViewStore;

const DAY = '2026-06-20';

// menu() is what a writer hands to setMenu — availability is never set with the menu.
// row() is what a reader gets back; mark() is one availability event's landing shape.
const menu = (overrides: Partial<MarketDayMenu> = {}): MarketDayMenu =>
  ({ marketId: 'market-1', date: DAY, itemIds: ['item-1'], ...overrides });
const row = (overrides: Partial<MarketDayView> = {}): MarketDayView =>
  ({ ...menu(), soldOutItemIds: [], closed: false, ...overrides });
const mark = (itemId: string): AvailabilityMark => ({ marketId: 'market-1', date: DAY, itemId });
const day: MarketDayRef = { marketId: 'market-1', date: DAY };

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
      await store.setMenu(menu({ itemIds: ['item-1', 'item-2'] }), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([row({ itemIds: ['item-1', 'item-2'] })]);
    });

    // A replay re-applies every MarketDayMenuSet for the day, so setting must replace
    // rather than accumulate — otherwise a rebuild multiplies the menu.
    it('replaces the menu when the day is set again', async () => {
      await store.setMenu(menu(), 'v1');
      await store.setMenu(menu({ itemIds: ['item-2', 'item-3'] }), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([row({ itemIds: ['item-2', 'item-3'] })]);
    });

    // A day emptied on purpose still reads back — a vendor who cleared the menu said
    // something, unlike a day nobody ever touched, which is simply absent.
    it('keeps the day with an empty menu when it is set to nothing', async () => {
      await store.setMenu(menu(), 'v1');
      await store.setMenu(menu({ itemIds: [] }), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([row({ itemIds: [] })]);
    });

    it('keeps menus apart by vendor and by date', async () => {
      await store.setMenu(menu(), 'v1');

      expect(await menusOn('v2', DAY)).toEqual([]);
      expect(await menusOn('v1', '2026-06-27')).toEqual([]);
    });

    // The window is inclusive at both ends, matching Recurrence.occurrencesWithin — the
    // horizon date is a day the caller asked about, not one past it.
    it('reads a window of days, in date then market order, skipping days nobody planned', async () => {
      await store.setMenu(menu({ marketId: 'market-2', itemIds: ['item-2'] }), 'v1');
      await store.setMenu(menu(), 'v1');
      await store.setMenu(menu({ date: '2026-06-13', itemIds: ['item-3'] }), 'v1');
      await store.setMenu(menu({ date: '2026-06-27', itemIds: ['item-4'] }), 'v1');

      expect(await store.menusFor('v1', DAY, '2026-06-27')).toEqual([
        row(),
        row({ marketId: 'market-2', itemIds: ['item-2'] }),
        row({ date: '2026-06-27', itemIds: ['item-4'] }),
      ]);
    });

    it('reads no other vendor\'s menus in the window', async () => {
      await store.setMenu(menu(), 'v2');

      expect(await store.menusFor('v1', DAY, '2026-06-27')).toEqual([]);
    });

    // Neither side shares array identity with the store: a caller mutating the menu it
    // handed in, or the one it read back, would otherwise reach into the store.
    it('does not share the menu array with callers', async () => {
      const written = menu();
      await store.setMenu(written, 'v1');
      written.itemIds.push('smuggled-in');

      const [read] = await menusOn('v1', DAY);
      read.itemIds.push('smuggled-out');
      read.soldOutItemIds.push('smuggled-out');

      expect(await menusOn('v1', DAY)).toEqual([row()]);
    });

    it('records a sold-out mark on a planned day', async () => {
      await store.setMenu(menu({ itemIds: ['item-1', 'item-2'] }), 'v1');

      await store.markSoldOut(mark('item-1'), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        row({ itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }),
      ]);
    });

    it('removes the mark when the item is marked available again', async () => {
      await store.setMenu(menu({ itemIds: ['item-1', 'item-2'] }), 'v1');
      await store.markSoldOut(mark('item-1'), 'v1');
      await store.markSoldOut(mark('item-2'), 'v1');

      await store.markAvailable(mark('item-1'), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        row({ itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-2'] }),
      ]);
    });

    // Mirrors market-day.ts:24 — a re-set menu keeps marks for items it still carries and
    // drops the rest, so a dish re-added mid-market comes back available.
    it('keeps only the marks a new menu still carries', async () => {
      await store.setMenu(menu({ itemIds: ['item-1', 'item-2'] }), 'v1');
      await store.markSoldOut(mark('item-1'), 'v1');
      await store.markSoldOut(mark('item-2'), 'v1');

      await store.setMenu(menu({ itemIds: ['item-2', 'item-3'] }), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        row({ itemIds: ['item-2', 'item-3'], soldOutItemIds: ['item-2'] }),
      ]);
    });

    // The aggregate guards marks to planned items on real days, so this only happens if a
    // projection replays out of order — staying absent beats inventing a row with no menu.
    it('ignores a mark for a day nobody planned', async () => {
      await store.markSoldOut(mark('item-1'), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([]);
    });

    it('ignores an available-mark for a day nobody planned', async () => {
      await store.markAvailable(mark('item-1'), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([]);
    });

    it('marks a planned day closed, and open again on reopen', async () => {
      await store.setMenu(menu(), 'v1');

      await store.close(day, 'v1');
      expect(await menusOn('v1', DAY)).toEqual([row({ closed: true })]);

      await store.reopen(day, 'v1');
      expect(await menusOn('v1', DAY)).toEqual([row({ closed: false })]);
    });

    // Decision 31 on the read side: closing says the stand packed up, not that the
    // bourguignon came back, so the marks the row already carries survive both ways.
    it('leaves sold-out marks alone across a close and reopen', async () => {
      await store.setMenu(menu({ itemIds: ['item-1', 'item-2'] }), 'v1');
      await store.markSoldOut(mark('item-1'), 'v1');

      await store.close(day, 'v1');
      await store.reopen(day, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([
        row({ itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }),
      ]);
    });

    // Not the mark's reasoning: a vendor who never planned a menu still closes the day
    // when they cannot come, so the close is the first thing that row ever holds.
    it('records a close for a day nobody planned as a closed day with no menu', async () => {
      await store.close(day, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([row({ itemIds: [], closed: true })]);
    });

    // Reopen keeps the mark's reasoning: there is nothing to reopen without a close, so a
    // row-less reopen is only ever a replay reaching it out of order.
    it('ignores a reopen for a day nobody planned', async () => {
      await store.reopen(day, 'v1');

      expect(await menusOn('v1', DAY)).toEqual([]);
    });

    // The menu is re-settable while the day is open (the aggregate refuses it once
    // closed), and a replay re-runs every MarketDayMenuSet — so setMenu must not
    // silently reopen a day the log later closed.
    it('keeps the day closed when its menu is set again', async () => {
      await store.setMenu(menu(), 'v1');
      await store.close(day, 'v1');

      await store.setMenu(menu({ itemIds: ['item-2'] }), 'v1');

      expect(await menusOn('v1', DAY)).toEqual([row({ itemIds: ['item-2'], closed: true })]);
    });

    it('clears every menu', async () => {
      await store.setMenu(menu(), 'v1');

      await store.clear();

      expect(await menusOn('v1', DAY)).toEqual([]);
    });
  });
}
