import { InMemoryEventStore } from '../../in-memory.event-store';
import { MarketDays, PlanItemsForMarketDayHandler, MarkItemAsSoldOutHandler, MarkItemAsSoldOut } from '@market-monster/market-days';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: MarkItemAsSoldOutHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store);
    handler = new MarkItemAsSoldOutHandler(marketDays);
  });

  it('should mark an item available today as sold out', async () => {
    const planItemsHandler = new PlanItemsForMarketDayHandler(marketDays);
    const itemId = 'item1';
    const vendorId = 'vendor1';
    const previousCommand = TestPlanItemsForMarketDay.forItems({ itemId });
    await planItemsHandler.handle(previousCommand);

    const command: MarkItemAsSoldOut = {
      vendorId,
      itemId,
      marketId: previousCommand.marketId,
      date: previousCommand.date,
      time: '10:00'
    };

    await handler.handle(command);

    expect(store.lastEvent().payload).toEqual(expect.objectContaining({
      itemId,
      marketId: previousCommand.marketId,
      date: previousCommand.date,
      time: '10:00'
    }));
  });
});
