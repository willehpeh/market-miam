import { createFeature, createReducer, on } from '@ngrx/store';
import { AmendMarketScheduleSuccess, RegisterMarketScheduleSuccess } from '../../markets/market-schedule.state';
import { MarketDaySlot, MarketDayView, UnratedMarketDay } from '../market-days';
import {
  ChangeItemAvailability,
  ChangeItemAvailabilityFailure,
  ChangeStandClosure,
  ChangeStandClosureFailure,
  LoadMarketDay,
  LoadMarketDayFailure,
  LoadMarketDays,
  LoadMarketDaysFailure,
  LoadMarketDaysSuccess,
  LoadMarketDaySuccess,
  LoadUnratedMarketDays,
  LoadUnratedMarketDaysFailure,
  LoadUnratedMarketDaysSuccess,
  RecordBilanSuccess,
  SetMarketDayMenuSuccess
} from './market-day.actions';

export interface MarketDayState {
  loading: boolean;
  fresh: boolean;
  days: MarketDayView[];
  day: MarketDaySlot;
  unrated: UnratedMarketDay[];
  unratedLoading: boolean;
  // Days whose bilan was saved whole and which the unrated query may still name anyway:
  // the projection lags the response by 4–275ms and the dashboard re-asks on arrival, so
  // the vendor's own finished bilan came back as *à faire* and stayed until a refresh.
  judged: string[];
}

export const initialState: MarketDayState = {
  loading: false,
  fresh: false,
  days: [],
  day: { status: 'loading' },
  unrated: [],
  unratedLoading: false,
  judged: [],
};

// A schedule change redraws which days exist, and only the API can expand the
// recurrence — so stale, not patched like the menu save below.
const wentStale = (state: MarketDayState): MarketDayState => ({ ...state, fresh: false });

// A day's identity as one string, for the mask below — both halves of it, for the reason
// patchDay gives underneath.
const dayKey = (marketId: string, date: string) => `${marketId}|${date}`;

// Which day a patch addresses, said once. Two markets can share a date (decision 25), so
// every optimistic patch below has to name both halves — and each rewriting of that made a
// place to get it wrong.
const patchDay = (
  state: MarketDayState,
  marketId: string,
  date: string,
  change: (day: MarketDayView) => MarketDayView,
): MarketDayState => ({
  ...state,
  days: state.days.map(day => (day.marketId === marketId && day.date === date ? change(day) : day)),
  // The slot is a second copy of one day, so every patch reaches it too — the live screen
  // reads it, and that is the screen the marks and the close are made from (decision 58).
  day: state.day.status === 'found' && state.day.day.marketId === marketId && state.day.day.date === date
    ? { status: 'found', day: change(state.day.day) }
    : state.day,
});

const patchAvailability = (state: MarketDayState, marketId: string, date: string, itemId: string, soldOut: boolean): MarketDayState =>
  patchDay(state, marketId, date, day => {
    const others = day.soldOutItemIds.filter(id => id !== itemId);
    return { ...day, soldOutItemIds: soldOut ? [...others, itemId] : others };
  });

export const marketDayFeature = createFeature({
  name: 'marketDays',
  reducer: createReducer<MarketDayState>(
    initialState,
    on(LoadMarketDays, (state): MarketDayState => ({ ...state, loading: true })),
    on(LoadMarketDaysSuccess, (state, { days }): MarketDayState => ({ ...state, loading: false, fresh: true, days })),
    // A failed load leaves the cache stale on purpose: the next screen visit retries.
    on(LoadMarketDaysFailure, (state): MarketDayState => ({ ...state, loading: false })),
    on(RegisterMarketScheduleSuccess, AmendMarketScheduleSuccess, wentStale),
    // A re-ask over a day already on screen must not flip to loading: the phase timer and
    // the tab coming back both fire on a screen the vendor is using, and a spinner over it
    // would be the poll's old sin in a new place.
    on(LoadMarketDay, (state): MarketDayState =>
      (state.day.status === 'found' ? state : { ...state, day: { status: 'loading' } })),
    on(LoadMarketDaySuccess, (state, { day }): MarketDayState => ({ ...state, day: { status: 'found', day } })),
    on(LoadMarketDayFailure, (state): MarketDayState => ({ ...state, day: { status: 'missing' } })),
    // Optimistic: the response is void and the projection lags it by 4–275ms, so the day
    // takes the ids that were just sent rather than waiting for a re-read that never comes.
    // ponytail: SetMarketDayMenuFailure is unreduced — same no-error-UX stance as the
    // catalogue's siblings; the interceptor surfaces 5xx and network failures.
    on(SetMarketDayMenuSuccess, (state, { marketId, date, itemIds }): MarketDayState =>
      patchDay(state, marketId, date, day => ({ ...day, itemIds }))),
    on(LoadUnratedMarketDays, (state): MarketDayState => ({ ...state, unratedLoading: true })),
    // The dashboard asks on every arrival, deliberately — a market ending mid-session has
    // nothing else to raise the prompt — so the answer is filtered rather than the question
    // withheld: a day judged whole is held back until the query stops naming it, which is
    // the projection catching up and the mask's own cue to drop it.
    on(LoadUnratedMarketDaysSuccess, (state, { marketDays }): MarketDayState => {
      const named = new Set(marketDays.map(day => dayKey(day.marketId, day.date)));
      return {
        ...state,
        unratedLoading: false,
        unrated: marketDays.filter(day => !state.judged.includes(dayKey(day.marketId, day.date))),
        judged: state.judged.filter(key => named.has(key)),
      };
    }),
    on(LoadUnratedMarketDaysFailure, (state): MarketDayState => ({ ...state, unratedLoading: false })),
    // On the response, like the menu above and for the same reason — and unreduced on
    // failure, which leaves the form standing with every answer in it (decision 74).
    // The prompt goes with it: arriving at a dashboard that no longer nags is the vendor's
    // receipt, which is why the bilan needs no toast (decision 74).
    // ponytail: dropped whatever was answered, so a bilan left half-finished stops nagging
    // until the next dashboard load re-asks — re-read the query here if that proves real.
    // Only a whole bilan joins the mask: a partial one is genuinely still unrated
    // (decision 65), so the re-read putting it back is the query being right, not late.
    on(RecordBilanSuccess, (state, { marketId, date, outcomes, complete }): MarketDayState => {
      const key = dayKey(marketId, date);
      return {
        ...patchDay(state, marketId, date, day => ({ ...day, outcomes })),
        unrated: state.unrated.filter(day => day.marketId !== marketId || day.date !== date),
        judged: complete && !state.judged.includes(key) ? [...state.judged, key] : state.judged,
      };
    }),
    // Optimistic on dispatch like the marks below, and for the same reason one rung up:
    // the whole-screen flip is the vendor's receipt (decision 38).
    on(ChangeStandClosure, (state, { marketId, date, closed }): MarketDayState =>
      patchDay(state, marketId, date, day => ({ ...day, closed }))),
    // A failed close reopens the stand, silently — the state returning is the disclosure.
    on(ChangeStandClosureFailure, (state, { marketId, date, closed }): MarketDayState =>
      patchDay(state, marketId, date, day => ({ ...day, closed: !closed }))),
    // Optimistic on dispatch, not on success: the moving row is the vendor's receipt
    // (live-mode decision 7), so it cannot wait on market wifi.
    on(ChangeItemAvailability, (state, { marketId, date, itemId, soldOut }): MarketDayState =>
      patchAvailability(state, marketId, date, itemId, soldOut)),
    // A failed tap snaps its own row back, silently — the row returning is the disclosure,
    // and the queued requests around it stand.
    on(ChangeItemAvailabilityFailure, (state, { marketId, date, itemId, soldOut }): MarketDayState =>
      patchAvailability(state, marketId, date, itemId, !soldOut)),
  ),
});
