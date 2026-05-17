import { InMemoryEventStore } from '../../in-memory.event-store';
import { MarketDays, PlanItemsForMarketDayHandler } from '@market-monster/market-days';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';

class MarkItemAsSoldOutHandler {
  constructor(private readonly marketDays: MarketDays) {}

  async handle(command: MarkItemAsSoldOut) {
    console.error('Not implemented');
  }
}

type MarkItemAsSoldOut = {
  vendorId: string;
  itemId: string;
  marketDayId: string;
  time: string;
}

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: MarkItemAsSoldOutHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store);
    handler = new MarkItemAsSoldOutHandler(marketDays);
  });

  it.skip('should mark an item available today as sold out', async () => {
    const planItemsHandler = new PlanItemsForMarketDayHandler(marketDays);
    const itemId = 'item1';
    const vendorId = 'vendor1';
    await planItemsHandler.handle(TestPlanItemsForMarketDay.forItems({ itemId }));
    const marketDayId = store.newEvents()[0].streamId;

    const command: MarkItemAsSoldOut = {
      vendorId,
      itemId,
      marketDayId,
      time: '10:00'
    };

    await handler.handle(command);

    expect(store.lastEvent()).toEqual(expect.objectContaining({
      itemId,
      marketDayId,
      time: '10:00'
    }));
  });
});
