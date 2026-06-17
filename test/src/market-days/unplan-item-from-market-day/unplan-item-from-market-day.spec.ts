import { InMemoryEventStore } from '../../in-memory.event-store';
import { MarketDays, UnplanItemFromMarketDay, UnplanItemFromMarketDayHandler } from '@market-monster/market-days';
import { LocalDate } from '@market-monster/common';

describe('Unplan Item From Market Day', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: UnplanItemFromMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store, { today: () => LocalDate.today() });
    handler = new UnplanItemFromMarketDayHandler(marketDays);
  });

  it('should unplan an item from a market day', async () => {
    const date = LocalDate.today().value();
    const command = new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', date);

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemUnplannedFromMarketDay',
        payload: { itemId: 'item-1', marketId: 'market-1', date }
      })
    ]);
  });
});
