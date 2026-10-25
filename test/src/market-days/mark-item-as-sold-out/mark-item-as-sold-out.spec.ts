import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemNotPlannedError, MarketDayClosedError, MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { closed, menuSet, soldOut } from '../market-day-events';
import { LAST_SATURDAY, SATURDAY, TODAY } from '../set-market-day-menu/test-data';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let given: (date: string, ...history: DomainEvent[]) => void;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;

  beforeEach(() => {
    ({ store, given, markSoldOut } = marketDayHarness());
  });

  it("marks an item on today's menu as sold out", async () => {
    given(TODAY, menuSet(TODAY, 'item-1'));

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemMarkedAsSoldOut',
        payload: { itemId: 'item-1', marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  // A re-statement, not a violation: a retried tap or a second device saying what is
  // already true appends nothing — a duplicate event would corrupt the availability
  // timeline. Same stance as setMenu unchanged and retiring twice.
  it('takes a second sold-out mark as a no-op, appending nothing', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), soldOut(TODAY, 'item-1'));

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([]);
  });

  it("rejects an item that is not on today's menu", async () => {
    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects an item that has been taken off the menu', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), menuSet(TODAY, 'item-2'));

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
  });

  it('marks an item sold out again once it returns to the menu', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), soldOut(TODAY, 'item-1'), menuSet(TODAY, 'item-2'), menuSet(TODAY, 'item-1'));

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemMarkedAsSoldOut' })]);
  });

  it("rejects an item that is on another day's menu", async () => {
    given(SATURDAY, menuSet(SATURDAY, 'item-1'));

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
  });

  it('rejects marking a future day sold out, even one with the item on its menu', async () => {
    given(SATURDAY, menuSet(SATURDAY, 'item-1'));

    await expect(() => markSoldOut(SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects marking a past day sold out', async () => {
    await expect(() => markSoldOut(LAST_SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([]);
  });

  // Once the stand is shut, *it's gone right now* is no longer a claim the day can
  // carry — what sold out that day becomes an outcome, recorded separately (decision 29).
  it('rejects marking an item sold out once the day is closed', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), closed(TODAY));

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(MarketDayClosedError);
    expect(store.newEvents()).toEqual([]);
  });
});
