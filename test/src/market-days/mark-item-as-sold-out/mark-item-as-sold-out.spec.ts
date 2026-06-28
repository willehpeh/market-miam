import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { VendorScopedEvents } from '@market-monster/market-days';
import {
  Catalogues, MarketDays, PlanItemsForMarketDayHandler, MarkItemAsSoldOutHandler, MarkItemAsSoldOut,
  ItemNotPlannedError, UnplanItemFromMarketDayHandler, UnplanItemFromMarketDay
} from '@market-monster/market-days';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';
import { Instant, LocalDate } from '@market-monster/common';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: MarkItemAsSoldOutHandler;
  let unplanHandler: UnplanItemFromMarketDayHandler;

  const TEST_TODAY = '2026-06-19';
  const TEST_FUTURE = '2026-07-01';

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(new VendorScopedEvents(store), {
      today: () => new LocalDate(TEST_TODAY),
      now: () => new Instant(`${TEST_TODAY}T09:00:00.000Z`),
    });
    handler = new MarkItemAsSoldOutHandler(marketDays);
    unplanHandler = new UnplanItemFromMarketDayHandler(marketDays);
  });

  async function addItemToCatalogueAndPlanIt(date: string) {
    const itemId = 'item1';
    const previousCommand = TestPlanItemsForMarketDay.forItemsWith([{ itemId }], {
      date
    });
    seedCatalogue(store, previousCommand.vendorId, itemId);
    const planItemsHandler = new PlanItemsForMarketDayHandler(marketDays, new Catalogues(new VendorScopedEvents(store)));
    await planItemsHandler.execute(previousCommand);
    return { itemId, previousCommand };
  }

  it('should mark an item available today as sold out', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt(TEST_TODAY);

    const command = new MarkItemAsSoldOut(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY, '10:00');

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemsPlannedForMarketDay' }),
      expect.objectContaining({
        type: 'ItemMarkedAsSoldOut',
        payload: {
          itemId,
          marketId: previousCommand.marketId,
          date: TEST_TODAY,
          time: '10:00'
        }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt(TEST_TODAY);
    await handler.execute(new MarkItemAsSoldOut(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY, '10:00'));

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('should reject marking an item not available today as sold out', async () => {
    const plan = TestPlanItemsForMarketDay.withDefaults();
    const command = new MarkItemAsSoldOut(plan.vendorId, plan.items[0].itemId, plan.marketId, TEST_TODAY, '10:00');

    await expect(() => handler.execute(command)).rejects.toThrow(ItemNotPlannedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('should reject marking an item that was planned for today then unplanned as sold out', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt(TEST_TODAY);
    const unplanCommand = new UnplanItemFromMarketDay(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY);
    await unplanHandler.execute(unplanCommand);

    const command = new MarkItemAsSoldOut(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY, '10:00');
    await expect(() => handler.execute(command)).rejects.toThrow(ItemNotPlannedError);
  });

  it('should reject marking an item planned for a different day as sold out', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt(TEST_FUTURE);

    const command = new MarkItemAsSoldOut(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY, '10:00');
    await expect(() => handler.execute(command)).rejects.toThrow(ItemNotPlannedError);
  });
});
