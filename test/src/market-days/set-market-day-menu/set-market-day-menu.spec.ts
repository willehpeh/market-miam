import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { EmptyValueError } from '@market-miam/common';
import {
  Catalogues,
  MarketDayClosedError,
  MarketDayInThePastError,
  NoSuchItemError,
  RetireItem,
  RetireItemHandler,
  SetMarketDayMenuHandler
} from '@market-miam/market-days';
import { LAST_SATURDAY, SATURDAY, TestSetMarketDayMenu, TODAY } from './test-data';
import { marketDayHarness } from '../market-day-harness';

describe('Set Market Day Menu', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: SetMarketDayMenuHandler;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let close: (date: string) => Promise<void>;

  beforeEach(() => {
    ({ store, catalogues, menus: handler, setMenu, close } = marketDayHarness());
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

  // Editing a closed day would clear its sold-out items, wiping the service-phase
  // record the day's outcomes are about to be read from (decision 29).
  it('rejects editing the menu once the day is closed', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await expect(() => setMenu(TODAY, 'item-2')).rejects.toThrow(MarketDayClosedError);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
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
