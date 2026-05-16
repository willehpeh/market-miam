import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { PlanItemsForMarketDayHandler } from '@market-monster/market-days';

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlanItemsForMarketDayHandler(store);
  });

  it('should plan an existing item with no quantity', async () => {
    const itemId = 'item-1';
    const planItemsForMarketDay = TestPlanItemsForMarketDay.forItems({ itemId });
    await handler.handle(planItemsForMarketDay);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: {
          items: [{ itemId }],
          marketId: planItemsForMarketDay.marketId,
          date: planItemsForMarketDay.date
        }
      })]);
  });
});
