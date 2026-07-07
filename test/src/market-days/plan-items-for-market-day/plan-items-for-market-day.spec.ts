import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { TestPlanItemsForMarketDay } from './test-data';
import {
  Catalogues,
  ItemsPlannedForMarketDay,
  MarketDays,
  NoSuchItemError,
  PlanItemsForMarketDayHandler
} from '@market-miam/market-days';
import { StoredEvent } from '@market-miam/event-sourcing';
import { DateClock, EmptyValueError, Instant } from '@market-miam/common';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Plan Items For Market Day', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let catalogues: Catalogues;
  let handler: PlanItemsForMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(new VendorScopedEvents(store), {
      today: () => new DateClock().today(),
      now: () => new Instant('2026-06-19T09:00:00.000Z'),
    });
    catalogues = new Catalogues(new VendorScopedEvents(store));
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2', 'item-3', 'item-4');
    handler = new PlanItemsForMarketDayHandler(marketDays, catalogues);
  });

  it('should plan items for a market day', async () => {
    const command = TestPlanItemsForMarketDay.withDefaults();
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: {
          items: [
            { itemId: 'item-1', name: 'Name for item-1', quantity: 10 },
            { itemId: 'item-2', name: 'Name for item-2' },
            { itemId: 'item-3', name: 'Name for item-3', quantity: 5 }
          ],
          marketId: command.marketId,
          date: command.date
        }
      })]);

    const event = store.newEvents()[0] as unknown as ItemsPlannedForMarketDay;
    expect(event.payload.items[1]).not.toHaveProperty('quantity');
  });

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(TestPlanItemsForMarketDay.withDefaults());

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
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

    expect(allPlannedItems).toEqual([
      { itemId: 'item-1', name: 'Name for item-1', quantity: 10 },
      { itemId: 'item-2', name: 'Name for item-2' },
      { itemId: 'item-3', name: 'Name for item-3', quantity: 5 },
      { itemId: 'item-3', name: 'Name for item-3', quantity: 5 },
      { itemId: 'item-4', name: 'Name for item-4', quantity: 15 }
    ]);
  });

  it('should refuse to plan items for a day in the past', async () => {
    const command = TestPlanItemsForMarketDay.forItemsWith([{ itemId: 'item-1' }], { date: '2023-01-01' });
    await expect(() => handler.execute(command)).rejects.toThrow();
  });

  it('should snapshot each planned item name from the catalogue', async () => {
    const command = TestPlanItemsForMarketDay.forItems({ itemId: 'item-2', quantity: 8 });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemsPlannedForMarketDay',
        payload: expect.objectContaining({
          items: [{ itemId: 'item-2', name: 'Name for item-2', quantity: 8 }]
        })
      })
    ]);
  });

  it('should refuse to plan an item not in the vendor catalogue', async () => {
    const command = TestPlanItemsForMarketDay.forItems({ itemId: 'not-in-catalogue', quantity: 5 });
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty item ID: "%s"', async (itemId) => {
    const command = TestPlanItemsForMarketDay.forItems({ itemId });
    await expect(() => handler.execute(command)).rejects.toThrow(EmptyValueError);
    expect(store.newEvents()).toEqual([]);
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
