import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { ItemAddedToRepertoire, PlanItemsForMarketDayHandler } from '@market-monster/market-days';

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlanItemsForMarketDayHandler(store);
  });

  it('should plan an existing item with no quantity', async () => {
    const itemId = 'item-1';
    const event: ItemAddedToRepertoire = {
      payload: {
        description: 'Item description',
        itemId,
        name: 'item name',
        photoUrl: 'https://photo.jpg',
        price: 200
      },
      type: 'ItemAddedToRepertoire'
    };
    store.seedWith(itemId, [{ event }]);
    const planItemsForMarketDay = TestPlanItemsForMarketDay.forItems({ itemId });
    await handler.handle(planItemsForMarketDay);

    expect(store.allEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemAddedToRepertoire',
      }),
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
