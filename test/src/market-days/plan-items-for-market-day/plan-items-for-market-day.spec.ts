import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { ItemsPlannedForMarketDay, MarketDays, PlanItemsForMarketDayHandler } from '@market-monster/market-days';

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
    const command = TestPlanItemsForMarketDay.withDefaults();
    await handler.handle(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: {
          items: command.items,
          marketId: command.marketId,
          date: command.date
        }
      })]);
  });

  it('should plan extra items for a pre-existing market day', async () => {
    const previousCommand = TestPlanItemsForMarketDay.withDefaults();
    await handler.handle(previousCommand);

    const newItems = [
      { itemId: 'item-3', quantity: 5 },
      { itemId: 'item-4', quantity: 15 }
    ];

    await handler.handle(TestPlanItemsForMarketDay.forItems(...newItems));

    const streamId = store.newEvents()[0].streamId;
    const allPlannedItems = (await store.load(streamId))
      .map(storedEvent => ({
        payload: storedEvent.payload,
        type: storedEvent.type
      } as ItemsPlannedForMarketDay))
      .flatMap(event => event.payload.items);

    expect(allPlannedItems).toEqual([...previousCommand.items, ...newItems]);
  });
});
