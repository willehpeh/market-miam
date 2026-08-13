import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Catalogues,
  ItemAlreadyAvailableError,
  ItemNotPlannedError,
  MarketDayNotTodayError,
  MarketDays,
  MarkItemAsAvailable,
  MarkItemAsAvailableHandler,
  MarkItemAsSoldOut,
  MarkItemAsSoldOutHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';
import { LAST_SATURDAY, SATURDAY, TestSetMarketDayMenu, TODAY } from '../set-market-day-menu/test-data';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Mark Item As Available', () => {
  let store: InMemoryEventStore;
  let handler: MarkItemAsAvailableHandler;
  let soldOut: MarkItemAsSoldOutHandler;
  let menus: SetMarketDayMenuHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    // clockAt's 09:00 UTC on a June day — 11:00 on the Paris wall clock the events record.
    const clock = clockAt(TODAY);
    const marketDays = new MarketDays(events, clock);
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    handler = new MarkItemAsAvailableHandler(marketDays, clock);
    soldOut = new MarkItemAsSoldOutHandler(marketDays, clock);
    menus = new SetMarketDayMenuHandler(marketDays, new Catalogues(events));
  });

  function setMenu(date: string, ...itemIds: string[]): Promise<void> {
    return menus.execute(TestSetMarketDayMenu.with({ date, itemIds }));
  }

  function markSoldOut(date: string, itemId = 'item-1'): Promise<void> {
    return soldOut.execute(new MarkItemAsSoldOut('vendor-1', itemId, 'market-1', date));
  }

  function markAvailable(date: string, itemId = 'item-1'): Promise<void> {
    return handler.execute(new MarkItemAsAvailable('vendor-1', itemId, 'market-1', date));
  }

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

  it('rejects an item that is not sold out', async () => {
    await setMenu(TODAY, 'item-1');

    await expect(() => markAvailable(TODAY)).rejects.toThrow(ItemAlreadyAvailableError);
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
