import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { MarketDayEndedError, MarketDayNotTodayError } from '@market-miam/market-days';
import { marketDayHarness, rescheduledTo, scheduledOn } from '../market-day-harness';
import { closed, menuSet, reopened, soldOut } from '../market-day-events';
import { LAST_SATURDAY, SATURDAY, TODAY } from '../set-market-day-menu/test-data';

describe('Reopen Market Day', () => {
  let store: InMemoryEventStore;
  let given: (date: string, ...history: DomainEvent[]) => void;
  let givenCalendar: (...history: DomainEvent[]) => void;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;
  let close: (date: string) => Promise<void>;
  let reopen: (date: string) => Promise<void>;

  beforeEach(() => {
    ({ store, given, givenCalendar, markSoldOut, close, reopen } = marketDayHarness());
  });

  it('reopens a closed market day', async () => {
    given(TODAY, closed(TODAY));

    await reopen(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayReopened',
        payload: { marketId: 'market-1', date: TODAY, time: '11:00' },
      }),
    ]);
  });

  it('takes a reopen of a day that was never closed as a no-op, appending nothing', async () => {
    await reopen(TODAY);

    expect(store.newEvents()).toEqual([]);
  });

  it('closes again after a reopen', async () => {
    given(TODAY, closed(TODAY), reopened(TODAY));

    await close(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayClosed' }),
    ]);
  });

  // Closing says the stand packed up, not that the bourguignon came back: a second
  // mark stays the no-op it was, so nothing is appended (decision 31).
  it('leaves sold-out items sold out across a close and reopen', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), soldOut(TODAY, 'item-1'), closed(TODAY), reopened(TODAY));

    await markSoldOut(TODAY);

    expect(store.newEvents()).toEqual([]);
  });

  // The stand can be reopened while the market is still running. Afterwards the day is
  // gone from every customer's view, so reopening it would claim a market that has packed
  // up — the aggregate holds the day's hours and refuses for itself.
  it('rejects reopening a day whose market has ended', async () => {
    givenCalendar(scheduledOn({ day: 'FRI', startTime: '07:00', endTime: '10:00' }));
    given(TODAY, closed(TODAY));

    await expect(() => reopen(TODAY)).rejects.toThrow(MarketDayEndedError);
    expect(store.newEvents()).toEqual([]);
  });

  it('reopens a day whose market is still running', async () => {
    givenCalendar(scheduledOn({ day: 'FRI', startTime: '07:00', endTime: '14:00' }));
    given(TODAY, closed(TODAY));

    await reopen(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayReopened' }),
    ]);
  });

  // The vendor moved their closing time later this morning; the day they are standing at
  // runs to the amended hours, not the ones it was registered with.
  it('reopens against amended hours', async () => {
    givenCalendar(
      scheduledOn({ day: 'FRI', startTime: '07:00', endTime: '10:00' }),
      rescheduledTo({ day: 'FRI', startTime: '07:00', endTime: '14:00' }),
    );
    given(TODAY, closed(TODAY));

    await reopen(TODAY);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketDayReopened' }),
    ]);
  });

  it.each([
    SATURDAY,
    LAST_SATURDAY,
  ])('rejects reopening a day that is not today: %s', async (date) => {
    await expect(() => reopen(date)).rejects.toThrow(MarketDayNotTodayError);
    expect(store.newEvents()).toEqual([]);
  });
});
