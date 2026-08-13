import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemNotPlannedError, MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { LAST_SATURDAY, SATURDAY, TODAY } from '../set-market-day-menu/test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Mark Item As Available', () => {
  let store: InMemoryEventStore;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;
  let markAvailable: (date: string, itemId?: string) => Promise<void>;

  beforeEach(() => {
    ({ store, setMenu, markSoldOut, markAvailable } = marketDayHarness());
  });

  it('marks a sold-out item as available again', async () => {
    await setMenu(TODAY, 'item-1');
    await markSoldOut(TODAY);

    await markAvailable(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
      expect.objectContaining({
        type: 'ItemMarkedAsAvailable',
        payload: { itemId: 'item-1', marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await setMenu(TODAY, 'item-1');
    await markSoldOut(TODAY);

    await markAvailable(TODAY);

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('lets an item sell out again after coming back', async () => {
    await setMenu(TODAY, 'item-1');
    await markSoldOut(TODAY);
    await markAvailable(TODAY);

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
      expect.objectContaining({ type: 'ItemMarkedAsAvailable' }),
      expect.objectContaining({ type: 'ItemMarkedAsSoldOut' }),
    ]);
  });

  it('takes marking a never-sold-out item available as a no-op, appending nothing', async () => {
    await setMenu(TODAY, 'item-1');

    await markAvailable(TODAY);

    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'MarketDayMenuSet' })]);
  });

  it("rejects an item that is not on today's menu", async () => {
    await expect(() => markAvailable(TODAY)).rejects.toThrow(ItemNotPlannedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects a day that is not today', async () => {
    await setMenu(SATURDAY, 'item-1');

    await expect(() => markAvailable(SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    await expect(() => markAvailable(LAST_SATURDAY)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'MarketDayMenuSet' })]);
  });
});
