import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { MarketDays, PlanItemsForMarketDayHandler } from '@market-monster/market-days';

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store);
    handler = new PlanItemsForMarketDayHandler(marketDays);
  });

  it('should plan items for a market day', async () => {
    const items = [
      { itemId: 'item-1', quantity: 10 },
      { itemId: 'item-2' },
    ];
    const planItemsForMarketDay = TestPlanItemsForMarketDay.forItems(...items);
    await handler.handle(planItemsForMarketDay);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: {
          items: [
            { itemId: 'item-1', quantity: 10 },
            { itemId: 'item-2', quantity: undefined },
          ],
          marketId: planItemsForMarketDay.marketId,
          date: planItemsForMarketDay.date
        }
      })]);
  });
});
