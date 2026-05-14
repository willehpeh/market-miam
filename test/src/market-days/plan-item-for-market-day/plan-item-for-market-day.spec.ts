import { InMemoryEventStore } from '../../in-memory.event-store';
import { EventStore } from '@market-monster/event-sourcing';
import { TestPlanItemsForMarketDay } from './test-data';
import { ItemAddedToRepertoire } from '@market-monster/market-days';

class PlanItemsForMarketDayHandler {
  constructor(private readonly store: EventStore) {
  }

  async handle(planItemsForMarketDay: PlanItemsForMarketDay) {
    const { items, marketId, date } = planItemsForMarketDay;
    const streamId = `market-day-${marketId}-${date}`;
    await this.store.append(streamId, [{
      event: {
        type: 'ItemsPlannedForMarketDay',
        payload: { items, marketId, date }
      }
    }], 0);
  }
}

export type PlannedItem = {
  itemId: string,
  quantity?: number,
};

export type PlanItemsForMarketDay = {
  vendorId: string,
  items: PlannedItem[],
  marketId: string,
  date: string,
};

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlanItemsForMarketDayHandler(store);
  });

  it('should plan an existing item with no quantity', () => {
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
    handler.handle(planItemsForMarketDay);

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
