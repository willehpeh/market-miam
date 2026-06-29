import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { VendorScopedEvents } from '@market-monster/market-days';
import {
  Catalogues,
  MarketDayInThePastError,
  MarketDays,
  PlanItemsForMarketDayHandler,
  UnplanItemFromMarketDay,
  UnplanItemFromMarketDayHandler
} from '@market-monster/market-days';
import { Instant, LocalDate } from '@market-monster/common';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Unplan Item From Market Day', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: UnplanItemFromMarketDayHandler;

  const TEST_TODAY = '2026-06-19';
  const TEST_FUTURE = '2026-07-03';
  const TEST_PAST = '2026-06-05';

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(new VendorScopedEvents(store), {
      today: () => new LocalDate(TEST_TODAY),
      now: () => new Instant(`${TEST_TODAY}T09:00:00.000Z`),
    });
    handler = new UnplanItemFromMarketDayHandler(marketDays);
  });

  async function addToCatalogueAndPlan(date: string, ...itemIds: string[]) {
    const command = TestPlanItemsForMarketDay.forItemsWith(itemIds.map(itemId => ({ itemId })), { date });
    seedCatalogue(store, command.vendorId, ...itemIds);
    const planHandler = new PlanItemsForMarketDayHandler(marketDays, new Catalogues(new VendorScopedEvents(store)));
    await planHandler.execute(command);
  }

  it.each([
    TEST_TODAY,
    TEST_FUTURE
  ])(`should unplan an item planned for market day on %s (today is ${ TEST_TODAY })`, async (date: string) => {
    await addToCatalogueAndPlan(date, 'item-1');

    await handler.execute(new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', date));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemsPlannedForMarketDay' }),
      expect.objectContaining({
        type: 'ItemUnplannedFromMarketDay',
        payload: { itemId: 'item-1', marketId: 'market-1', date }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await addToCatalogueAndPlan(TEST_TODAY, 'item-1');

    await handler.execute(new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', TEST_TODAY));

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('should leave other planned items intact when one is unplanned', async () => {
    await addToCatalogueAndPlan(TEST_TODAY, 'item-1', 'item-2');
    await handler.execute(new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', TEST_TODAY));

    await handler.execute(new UnplanItemFromMarketDay('vendor-1', 'item-2', 'market-1', TEST_TODAY));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemsPlannedForMarketDay' }),
      expect.objectContaining({
        type: 'ItemUnplannedFromMarketDay',
        payload: { itemId: 'item-1', marketId: 'market-1', date: TEST_TODAY }
      }),
      expect.objectContaining({
        type: 'ItemUnplannedFromMarketDay',
        payload: { itemId: 'item-2', marketId: 'market-1', date: TEST_TODAY }
      })
    ]);
  });

  it('should not raise an event when unplanning an item that was never planned', async () => {
    await handler.execute(new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', TEST_TODAY));

    expect(store.newEvents()).toEqual([]);
  });

  it('should reject unplanning an item from a market day before today', async () => {
    const command = new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', TEST_PAST);

    await expect(() => handler.execute(command)).rejects.toThrow(MarketDayInThePastError);
    expect(store.newEvents()).toEqual([]);
  });
});
