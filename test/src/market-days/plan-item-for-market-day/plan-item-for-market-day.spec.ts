import { InMemoryEventStore } from '../../in-memory.event-store';
import { EventStore } from '@market-monster/event-sourcing';
import { TestPlanItemForMarketDay } from './test-data';
import { ItemAddedToRepertoire } from '@market-monster/market-days';
import { describe, it, beforeEach } from 'vitest';

class PlanItemForMarketDayHandler {
  constructor(private readonly store: EventStore) {
  }

  handle(planItemForMarketDay: PlanItemForMarketDay) {
    throw new Error('Not implemented');
  }
}

export type PlanItemForMarketDay = {
  itemId: string,
  marketDayId: string,
  quantity?: number
};

describe.skip('Plan Item For Market Day', () => {
  let store: InMemoryEventStore;
  let handler: PlanItemForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlanItemForMarketDayHandler(store);
  });

  it('should plan an existing item with no quantity', () => {
    const itemId = 'item-1';
    const event: ItemAddedToRepertoire = {
      payload: { description: 'Item description', itemId, name: 'item name', photoUrl: 'https://photo.jpg', price: 200 },
      type: 'ItemAddedToRepertoire'
    };
    store.seedWith('item-1', event);
    handler.handle(TestPlanItemForMarketDay.forItem('item-1'));
  });
});
