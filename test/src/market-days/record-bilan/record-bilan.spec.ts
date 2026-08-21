import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemNotPlannedError, ItemOutcome, MarketDayNotFinishedError } from '@market-miam/market-days';
import { marketDayHarness } from '../market-day-harness';
import { LAST_SATURDAY, TODAY } from '../set-market-day-menu/test-data';

describe('Record Bilan', () => {
  let store: InMemoryEventStore;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let close: (date: string) => Promise<void>;
  let schedule: (day: { day: string; startTime?: string; endTime?: string }) => Promise<void>;
  let reopen: (date: string) => Promise<void>;
  let recordBilan: (date: string, outcomes: Record<string, ItemOutcome>) => Promise<void>;

  beforeEach(() => {
    ({ store, setMenu, close, reopen, schedule, recordBilan } = marketDayHarness());
  });

  // The bilan: what the vendor says about how each dish sold, once the stand is shut.
  // Its own judgment, not the availability timeline — *it's gone right now* against
  // *it sold out that day* (decision 49).
  it('records how the day sold, once the vendor has closed', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await close(TODAY);

    await recordBilan(TODAY, { 'item-1': 'did_well', 'item-2': 'sold_out' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({
        type: 'MarketDayBilanRecorded',
        payload: { outcomes: { 'item-1': 'did_well', 'item-2': 'sold_out' }, marketId: 'market-1', date: TODAY },
      }),
    ]);
  });

  // Decision 54's boundary, not decision 29's: the bilan is a judgment about a day that is
  // over, and a market still running has nothing to judge. `did well` at 10h is a guess.
  it('refuses a day the vendor is still trading', async () => {
    await setMenu(TODAY, 'item-1');

    await expect(() => recordBilan(TODAY, { 'item-1': 'did_well' })).rejects.toThrow(MarketDayNotFinishedError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'MarketDayMenuSet' })]);
  });

  // The other half of decision 54, and the vendor it exists for: the one who packs up,
  // drives home and never taps close. The clock ended their day, so the bilan is open.
  it('accepts a day the clock ended, with no close tapped', async () => {
    await schedule({ day: 'FRI', startTime: '07:00', endTime: '10:00' });
    await setMenu(TODAY, 'item-1');

    await recordBilan(TODAY, { 'item-1': 'did_not_do_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded', payload: expect.objectContaining({ outcomes: { 'item-1': 'did_not_do_well' } }) }),
    ]);
  });

  // Mirrors ItemNotPlannedError one command over: a dish that was never on the menu has
  // no day to be judged against.
  it('refuses an item the menu never planned', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await expect(() => recordBilan(TODAY, { 'item-2': 'did_well' })).rejects.toThrow(ItemNotPlannedError);
  });

  // Decision 69 drops the today guard for this command alone. The dashboard prompts for an
  // unrated day up to a week back, and a vendor who does their books on Sunday morning is
  // the vendor the whole slice exists for — a bilan is a claim about a day that is over,
  // never about right now, which is the distinction decision 16's guard was drawn on.
  // The menu is seeded rather than set: setMenu still refuses a past day.
  it('accepts a day already behind the vendor', async () => {
    store.seedWith(
      `market-day/vendor-1/market-1/${LAST_SATURDAY}`,
      [{ type: 'MarketDayMenuSet', payload: { itemIds: ['item-1'], marketId: 'market-1', date: LAST_SATURDAY }, version: 1 }],
      { vendorId: 'vendor-1' },
    );

    await recordBilan(LAST_SATURDAY, { 'item-1': 'did_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayBilanRecorded', payload: expect.objectContaining({ date: LAST_SATURDAY }) }),
    ]);
  });

  // Decision 36's rule, one command over: a re-tapped answer must not append a second
  // event, because decision 49's prefill and the bilan's own reads walk this timeline.
  it('takes the same outcome again as a no-op, appending nothing', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordBilan(TODAY, { 'item-1': 'did_well' });

    await recordBilan(TODAY, { 'item-1': 'did_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
    ]);
  });

  // A changed answer is not a re-statement — *overridable* in decision 49 is exactly this,
  // and the vendor correcting themselves is the case it was written for.
  it('appends when the vendor changes their mind', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordBilan(TODAY, { 'item-1': 'did_well' });

    await recordBilan(TODAY, { 'item-1': 'sold_out' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded', payload: expect.objectContaining({ outcomes: { 'item-1': 'did_well' } }) }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded', payload: expect.objectContaining({ outcomes: { 'item-1': 'sold_out' } }) }),
    ]);
  });

  // Decision 30: the vendor closes at 11h30, does the bilan, a straggler turns up and they
  // reopen and sell more — every judgment they made is now about a day that kept going.
  // Observed through the no-op rule: the same answer appends again only if it was cleared.
  it('clears the bilan when the day reopens', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordBilan(TODAY, { 'item-1': 'did_well' });
    await reopen(TODAY);
    await close(TODAY);

    await recordBilan(TODAY, { 'item-1': 'did_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
      expect.objectContaining({ type: 'MarketDayReopened' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
    ]);
  });

  // Decision 75: *je ne peux pas venir* at 11h for a market that opens at 14h calls the day
  // off — the vendor never stands there, so there is nothing to look back on. The clock
  // running past 18h does not make one, either: the same day is still one they never traded.
  it('refuses a stand called off before its market opened', async () => {
    await schedule({ day: 'FRI', startTime: '14:00', endTime: '18:00' });
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await expect(() => recordBilan(TODAY, { 'item-1': 'did_well' })).rejects.toThrow(MarketDayNotFinishedError);
    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
    ]);
  });

  // The other side of decision 75, and the vendor 2b was written for: they stood at the
  // market from 7h, packed up at 11h, and that day is theirs to judge.
  it('accepts a stand the vendor packed up once the market had opened', async () => {
    await schedule({ day: 'FRI', startTime: '07:00', endTime: '18:00' });
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await recordBilan(TODAY, { 'item-1': 'did_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayClosed' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
    ]);
  });

  // The same trap sold-out has at market-day.ts:42, reachable on the day 2b exists for: an
  // ended day is never closed, so setMenu still accepts it (decision 54 kept that boundary,
  // decision 63 only took the link away). Drop a dish and bring it back and its old answer
  // would linger, where the no-op rule would then swallow the vendor's tap.
  it('drops the outcome of an item taken off the menu', async () => {
    await schedule({ day: 'FRI', startTime: '07:00', endTime: '10:00' });
    await setMenu(TODAY, 'item-1');
    await recordBilan(TODAY, { 'item-1': 'did_well' });
    await setMenu(TODAY, 'item-2');
    await setMenu(TODAY, 'item-1');

    await recordBilan(TODAY, { 'item-1': 'did_well' });

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayMenuSet' }),
      expect.objectContaining({ type: 'MarketDayBilanRecorded' }),
    ]);
  });
});
