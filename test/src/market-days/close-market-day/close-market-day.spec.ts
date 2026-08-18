import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { LAST_SATURDAY, SATURDAY, TODAY } from '../set-market-day-menu/test-data';

describe('Close Market Day', () => {
  let store: InMemoryEventStore;
  let close: (date: string) => Promise<void>;

  beforeEach(() => {
    ({ store, close } = marketDayHarness());
  });

  // No menu: a vendor whose van broke down closes a day they never planned — the
  // *Je ne peux pas venir aujourd'hui* door onto the same event (decisions 40, 45).
  it("closes today's market day", async () => {
    await close(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayClosed',
        payload: { marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  // A vendor packing up on market signal retries; the idempotent route (decision 44)
  // has no way to surface a redundant tap as a failure, so the domain absorbs it.
  it('takes a second close as a no-op, appending nothing', async () => {
    await close(TODAY);

    await close(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayClosed' }),
    ]);
  });

  it.each([
    SATURDAY,
    LAST_SATURDAY,
  ])('rejects closing a day that is not today: %s', async (date) => {
    await expect(() => close(date)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([]);
  });
});
