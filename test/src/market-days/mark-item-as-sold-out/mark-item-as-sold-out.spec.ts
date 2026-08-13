import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemAlreadySoldOutError, ItemNotPlannedError, MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { LAST_SATURDAY, SATURDAY, TODAY } from '../set-market-day-menu/test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;

  beforeEach(() => {
    ({ store, setMenu, markSoldOut } = marketDayHarness());
  });

  it("marks an item on today's menu as sold out", async () => {
    await setMenu(TODAY, 'item-1');

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({
        type: 'ItemMarkedAsSoldOut',
        payload: { itemId: 'item-1', marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await setMenu(TODAY, 'item-1');

    await markSoldOut(TODAY);

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('rejects an item that is already sold out', async () => {
    await setMenu(TODAY, 'item-1');
    await markSoldOut(TODAY);

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemAlreadySoldOutError);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
    ]);
  });

  it("rejects an item that is not on today's menu", async () => {
    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects an item that has been taken off the menu', async () => {
    await setMenu(TODAY, 'item-1');
    await setMenu(TODAY, 'item-2');

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
  });

  it('marks an item sold out again once it returns to the menu', async () => {
    await setMenu(TODAY, 'item-1');
    await markSoldOut(TODAY);
    await setMenu(TODAY, 'item-2');

    await setMenu(TODAY, 'item-1');

    await markSoldOut(TODAY);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
    ]);
  });

  it("rejects an item that is on another day's menu", async () => {
    await setMenu(SATURDAY, 'item-1');

    await expect(() => markSoldOut(TODAY)).rejects.toThrow(ItemNotPlannedError);
  });

  it('rejects marking a future day sold out, even one with the item on its menu', async () => {
    await setMenu(SATURDAY, 'item-1');

    await expect(() => markSoldOut(SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'MarketDayMenuSet' })]);
  });

  it('rejects marking a past day sold out', async () => {
    await expect(() => markSoldOut(LAST_SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([]);
  });
});
