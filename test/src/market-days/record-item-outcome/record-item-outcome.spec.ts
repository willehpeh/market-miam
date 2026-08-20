import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemNotPlannedError, ItemOutcome, MarketDayNotFinishedError, MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { LAST_SATURDAY, TODAY } from '../set-market-day-menu/test-data';

describe('Record Item Outcome', () => {
  let store: InMemoryEventStore;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let close: (date: string) => Promise<void>;
  let schedule: (day: { day: string; startTime?: string; endTime?: string }) => Promise<void>;
  let reopen: (date: string) => Promise<void>;
  let recordOutcome: (date: string, itemId: string, outcome: ItemOutcome) => Promise<void>;

  beforeEach(() => {
    ({ store, setMenu, close, reopen, schedule, recordOutcome } = marketDayHarness());
  });

  // The bilan: what the vendor says about how each dish sold, once the stand is shut.
  // Its own judgment, not the availability timeline — *it's gone right now* against
  // *it sold out that day* (decision 49).
  it('records how an item sold on a day the vendor has closed', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await recordOutcome(TODAY, 'item-1', 'did_well');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({
        type: 'ItemOutcomeRecorded',
        payload: { itemId: 'item-1', outcome: 'did_well', marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  // Decision 54's boundary, not decision 29's: the bilan is a judgment about a day that is
  // over, and a market still running has nothing to judge. `did well` at 10h is a guess.
  it('refuses a day the vendor is still trading', async () => {
    await setMenu(TODAY, 'item-1');

    await expect(() => recordOutcome(TODAY, 'item-1', 'did_well')).rejects.toThrow(MarketDayNotFinishedError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'MarketDayMenuSet' })]);
  });

  // The other half of decision 54, and the vendor it exists for: the one who packs up,
  // drives home and never taps close. The clock ended their day, so the bilan is open.
  it('accepts a day the clock ended, with no close tapped', async () => {
    await schedule({ day: 'FRI', startTime: '07:00', endTime: '10:00' });
    await setMenu(TODAY, 'item-1');

    await recordOutcome(TODAY, 'item-1', 'did_not_do_well');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded', payload: expect.objectContaining({ outcome: 'did_not_do_well' }) }),
    ]);
  });

  // Mirrors ItemNotPlannedError one command over: a dish that was never on the menu has
  // no day to be judged against.
  it('refuses an item the menu never planned', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await expect(() => recordOutcome(TODAY, 'item-2', 'did_well')).rejects.toThrow(ItemNotPlannedError);
  });

  // Decision 16's guard, unchanged by the bilan: yesterday's market is not this app's to
  // reopen the books on, and the retrospective that would is deferred (decision 14a).
  it('refuses a day that is not today', async () => {
    await expect(() => recordOutcome(LAST_SATURDAY, 'item-1', 'did_well')).rejects.toThrow(MarketDayNotTodayError);
  });

  // Decision 36's rule, one command over: a re-tapped answer must not append a second
  // event, because decision 49's prefill and the bilan's own reads walk this timeline.
  it('takes the same outcome again as a no-op, appending nothing', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordOutcome(TODAY, 'item-1', 'did_well');

    await recordOutcome(TODAY, 'item-1', 'did_well');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded' }),
    ]);
  });

  // A changed answer is not a re-statement — *overridable* in decision 49 is exactly this,
  // and the vendor correcting themselves is the case it was written for.
  it('appends when the vendor changes their mind', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordOutcome(TODAY, 'item-1', 'did_well');

    await recordOutcome(TODAY, 'item-1', 'sold_out');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded', payload: expect.objectContaining({ outcome: 'did_well' }) }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded', payload: expect.objectContaining({ outcome: 'sold_out' }) }),
    ]);
  });

  // Decision 30: the vendor closes at 11h30, does the bilan, a straggler turns up and they
  // reopen and sell more — every judgment they made is now about a day that kept going.
  // Observed through the no-op rule: the same answer appends again only if it was cleared.
  it('clears the bilan when the day reopens', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordOutcome(TODAY, 'item-1', 'did_well');
    await reopen(TODAY);
    await close(TODAY);

    await recordOutcome(TODAY, 'item-1', 'did_well');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded' }),
      expect.objectContaining({ type: 'MarketDayReopened' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded' }),
    ]);
  });

  // The same trap sold-out has at market-day.ts:42, reachable on the day 2b exists for: an
  // ended day is never closed, so setMenu still accepts it (decision 54 kept that boundary,
  // decision 63 only took the link away). Drop a dish and bring it back and its old answer
  // would linger, where the no-op rule would then swallow the vendor's tap.
  it('drops the outcome of an item taken off the menu', async () => {
    await schedule({ day: 'FRI', startTime: '07:00', endTime: '10:00' });
    await setMenu(TODAY, 'item-1');
    await recordOutcome(TODAY, 'item-1', 'did_well');
    await setMenu(TODAY, 'item-2');
    await setMenu(TODAY, 'item-1');

    await recordOutcome(TODAY, 'item-1', 'did_well');

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'ItemOutcomeRecorded' }),
    ]);
  });
});
