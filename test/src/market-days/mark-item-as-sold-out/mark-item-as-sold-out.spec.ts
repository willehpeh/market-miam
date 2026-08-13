import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Catalogues,
  ItemAlreadySoldOutError,
  ItemNotPlannedError,
  MarketDays,
  MarkItemAsSoldOut,
  MarkItemAsSoldOutHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { Instant, LocalDate } from '@market-miam/common';
import { SATURDAY, TestSetMarketDayMenu, TODAY } from '../set-market-day-menu/test-data';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let handler: MarkItemAsSoldOutHandler;
  let menus: SetMarketDayMenuHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    // 09:00 UTC on a June day — 11:00 on the Paris wall clock the event records.
    const clock = {
      today: () => new LocalDate(TODAY),
      now: () => new Instant(`${TODAY}T09:00:00.000Z`),
    };
    const marketDays = new MarketDays(events, clock);
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    handler = new MarkItemAsSoldOutHandler(marketDays, clock);
    menus = new SetMarketDayMenuHandler(marketDays, new Catalogues(events));
  });

  function setMenu(date: string, ...itemIds: string[]): Promise<void> {
    return menus.execute(TestSetMarketDayMenu.with({ date, itemIds }));
  }

  function markSoldOut(date: string, itemId = 'item-1'): Promise<void> {
    return handler.execute(new MarkItemAsSoldOut('vendor-1', itemId, 'market-1', date));
  }

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
});
