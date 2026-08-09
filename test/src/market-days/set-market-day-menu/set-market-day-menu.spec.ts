import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { EmptyValueError, Instant, LocalDate } from '@market-miam/common';
import {
  Catalogues,
  MarketDayInThePastError,
  MarketDays,
  NoSuchItemError,
  RetireItem,
  RetireItemHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { LAST_SATURDAY, SATURDAY, TestSetMarketDayMenu, TODAY } from './test-data';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Set Market Day Menu', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: SetMarketDayMenuHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    const marketDays = new MarketDays(events, {
      today: () => new LocalDate(TODAY),
      now: () => new Instant(`${TODAY}T09:00:00.000Z`),
    });
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    catalogues = new Catalogues(events);
    handler = new SetMarketDayMenuHandler(marketDays, catalogues);
  });

  it('sets the menu for a market day', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-1'] }));

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('raises nothing when the menu is unchanged', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    await handler.execute(TestSetMarketDayMenu.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });

  it('rejects an item that is not in the catalogue', async () => {
    const command = TestSetMarketDayMenu.with({ itemIds: ['item-1', 'not-in-catalogue'] });

    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });

  it('rejects an item that has been retired', async () => {
    await new RetireItemHandler(catalogues).execute(new RetireItem('vendor-1', 'item-2'));

    const command = TestSetMarketDayMenu.with({ itemIds: ['item-1', 'item-2'] });

    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemRetired' })]);
  });

  it('rejects a menu for a market day in the past', async () => {
    const command = TestSetMarketDayMenu.with({ date: LAST_SATURDAY });

    await expect(() => handler.execute(command)).rejects.toThrow(MarketDayInThePastError);
    expect(store.newEvents()).toEqual([]);
  });

  it('sets the menu for a market day happening today', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ date: TODAY }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: TODAY },
      }),
    ]);
  });

  it.each([
    '',
    '   ',
  ])('rejects an empty item id: "%s"', async (itemId) => {
    const command = TestSetMarketDayMenu.with({ itemIds: [itemId] });

    await expect(() => handler.execute(command)).rejects.toThrow(EmptyValueError);
    expect(store.newEvents()).toEqual([]);
  });

  it('clears the menu', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    await handler.execute(TestSetMarketDayMenu.with({ itemIds: [] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: [], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });

  it('raises nothing when the menu is reordered', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-1', 'item-2'] }));

    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-2', 'item-1'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });

  // A persisted address, not an implementation detail: once vendors have set menus, an
  // edit here orphans every stream they wrote.
  it('addresses the market day by vendor, market and date', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    expect(store.newEvents().map(event => event.streamId))
      .toEqual([`market-day/vendor-1/market-1/${SATURDAY}`]);
  });

  it('collapses a repeated item into a single menu entry', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-1', 'item-2', 'item-1'] }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });
});
