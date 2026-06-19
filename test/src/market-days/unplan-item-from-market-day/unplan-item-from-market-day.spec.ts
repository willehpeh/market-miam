import { InMemoryEventStore } from '../../in-memory.event-store';
import { MarketDays, UnplanItemFromMarketDay, UnplanItemFromMarketDayHandler } from '@market-monster/market-days';
import { LocalDate } from '@market-monster/common';
import { MarketDayInThePastError } from '../../../../packages/market-days/src/market-day/errors';

describe('Unplan Item From Market Day', () => {
  let store: InMemoryEventStore;
  let marketDays: MarketDays;
  let handler: UnplanItemFromMarketDayHandler;

  const TEST_TODAY = '2026-06-19';
  const TEST_FUTURE = '2026-07-03';
  const TEST_PAST = '2026-06-05';

  beforeEach(() => {
    store = new InMemoryEventStore();
    marketDays = new MarketDays(store, { today: () => new LocalDate(TEST_TODAY) });
    handler = new UnplanItemFromMarketDayHandler(marketDays);
  });

  it.each([
    TEST_TODAY,
    TEST_FUTURE
  ])(`should unplan an item from market day on %s (today is ${ TEST_TODAY })`, async (date: string) => {
    const command = new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', date);

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemUnplannedFromMarketDay',
        payload: { itemId: 'item-1', marketId: 'market-1', date }
      })
    ]);
  });

  it('should reject unplanning an item from a market day before today', async () => {
    const command = new UnplanItemFromMarketDay('vendor-1', 'item-1', 'market-1', TEST_PAST);

    await expect(() => handler.execute(command)).rejects.toThrow(MarketDayInThePastError);
    expect(store.newEvents()).toEqual([]);
  });
});
