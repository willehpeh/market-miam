import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestPlanItemsForMarketDay } from './test-data';
import { ItemsPlannedForMarketDay, MarketDays, PlanItemsForMarketDayHandler } from '@market-monster/market-days';
import { StoredEvent } from '@market-monster/event-sourcing';

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
    await handler.execute(command);

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
    await handler.execute(previousCommand);

    const newItems = [
      { itemId: 'item-3', quantity: 5 },
      { itemId: 'item-4', quantity: 15 }
    ];
    await handler.execute(TestPlanItemsForMarketDay.forItems(...newItems));

    const stream = await store.load(store.newEvents()[0].streamId);
    const allPlannedItems = plannedItemsFrom(stream)

    expect(allPlannedItems).toEqual([...previousCommand.items, ...newItems]);
  });

  it('should refuse to plan items for a day in the past', async () => {
    const command = TestPlanItemsForMarketDay.forItemsWith([{ itemId: 'item-1' }], { date: '2023-01-01' });
    await expect(() => handler.execute(command)).rejects.toThrow();
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty item ID: "%s"', async (itemId) => {
    const command = TestPlanItemsForMarketDay.forItems({ itemId });
    await expect(() => handler.execute(command)).rejects.toThrow();
  });

  it.each([
    0,
    -1,
    -100,
  ])('should reject a non-positive quantity: %d', async (quantity) => {
    const command = TestPlanItemsForMarketDay.forItems({ itemId: 'item-1', quantity });
    await expect(() => handler.execute(command)).rejects.toThrow();
  });
});

function plannedItemsFrom(stream: StoredEvent[]) {
  return stream
    .flatMap(storedEvent => ({
      payload: storedEvent.payload,
      type: storedEvent.type
    } as ItemsPlannedForMarketDay).payload.items);
}
