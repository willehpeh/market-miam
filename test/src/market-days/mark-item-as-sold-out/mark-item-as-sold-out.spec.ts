import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  Catalogues, MarketDays, PlanItemsForMarketDayHandler, MarkItemAsSoldOutHandler, MarkItemAsSoldOut,
  ItemNotPlannedError, UnplanItemFromMarketDayHandler, UnplanItemFromMarketDay
} from '@market-monster/market-days';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';
import { LocalDate } from '@market-monster/common';
import { seedCatalogue } from '../../seed-catalogue';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: MarkItemAsSoldOutHandler;
  let unplanHandler: UnplanItemFromMarketDayHandler;

  const TEST_TODAY = '2026-06-19';

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store, { today: () => new LocalDate(TEST_TODAY) });
    handler = new MarkItemAsSoldOutHandler(marketDays);
    unplanHandler = new UnplanItemFromMarketDayHandler(marketDays);
  });

  async function addItemToCatalogueAndPlanIt() {
    const itemId = 'item1';
    const previousCommand = TestPlanItemsForMarketDay.forItemsWith([{ itemId }], {
      date: TEST_TODAY
    });
    seedCatalogue(store, previousCommand.vendorId, itemId);
    const planItemsHandler = new PlanItemsForMarketDayHandler(marketDays, new Catalogues(store));
    await planItemsHandler.execute(previousCommand);
    return { itemId, previousCommand };
  }

  it('should mark an item available today as sold out', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt();

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

  it('should reject marking an item not available today as sold out', async () => {
    const plan = TestPlanItemsForMarketDay.withDefaults();
    const command = new MarkItemAsSoldOut(plan.vendorId, plan.items[0].itemId, plan.marketId, TEST_TODAY, '10:00');

    await expect(() => handler.execute(command)).rejects.toThrow(ItemNotPlannedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('should reject marking an item that was planned for today then unplanned as sold out', async () => {
    const { itemId, previousCommand } = await addItemToCatalogueAndPlanIt();
    const unplanCommand = new UnplanItemFromMarketDay(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY);
    await unplanHandler.execute(unplanCommand);

    const command = new MarkItemAsSoldOut(previousCommand.vendorId, itemId, previousCommand.marketId, TEST_TODAY, '10:00');
    await expect(() => handler.execute(command)).rejects.toThrow(ItemNotPlannedError);
  });
});
