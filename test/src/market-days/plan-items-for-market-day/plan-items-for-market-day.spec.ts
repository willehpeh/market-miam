import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { PlanItemsForMarketDayHandler, PlannedItem } from '@market-monster/market-days';

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlanItemsForMarketDayHandler(store);
  });

  it('should plan items for a market day', async () => {
    const items: PlannedItem[] = [
      { itemId: 'item-1', quantity: 10 },
      { itemId: 'item-2' },
    ];
    const planItemsForMarketDay = TestPlanItemsForMarketDay.forItems(...items);
    await handler.handle(planItemsForMarketDay);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: {
          items,
          marketId: planItemsForMarketDay.marketId,
          date: planItemsForMarketDay.date
        }
      })]);
  });
});
