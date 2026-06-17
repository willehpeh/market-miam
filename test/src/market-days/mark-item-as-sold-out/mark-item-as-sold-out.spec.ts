import { InMemoryEventStore } from '../../in-memory.event-store';
import { Catalogues, MarketDays, PlanItemsForMarketDayHandler, MarkItemAsSoldOutHandler, MarkItemAsSoldOut } from '@market-monster/market-days';
import { TestPlanItemsForMarketDay } from '../plan-items-for-market-day/test-data';
import { LocalDate } from '@market-monster/common';
import { seedCatalogue } from '../../seed-catalogue';

describe('Mark Item As Sold Out', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: MarkItemAsSoldOutHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store, { today: () => LocalDate.today() });
    handler = new MarkItemAsSoldOutHandler(marketDays);
  });

  it('should mark an item available today as sold out', async () => {
    const itemId = 'item1';
    const vendorId = 'vendor1';
    const today = LocalDate.today().value();
    const previousCommand = TestPlanItemsForMarketDay.forItemsWith([{ itemId }], {
      date: today
    });
    seedCatalogue(store, previousCommand.vendorId, itemId);
    const planItemsHandler = new PlanItemsForMarketDayHandler(marketDays, new Catalogues(store));
    await planItemsHandler.execute(previousCommand);

    const command = new MarkItemAsSoldOut(vendorId, itemId, previousCommand.marketId, today, '10:00');

    await handler.execute(command);

    expect(store.lastEvent().payload).toEqual(expect.objectContaining({
      itemId,
      marketId: previousCommand.marketId,
      date: today,
      time: '10:00'
    }));
  });
});
