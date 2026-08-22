import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AmendMarketScheduleSuccess, RegisterMarketScheduleSuccess } from '../markets/market-schedule.state';
import { ItemOutcome, MarketDaySlot, MarketDayView, UnratedMarketDay } from './market-days';

export const LoadMarketDays = createAction('[Market Days] Load');
export const LoadMarketDaysSuccess = createAction('[Market Days] Load Success', props<{ days: MarketDayView[] }>());
export const LoadMarketDaysFailure = createAction('[Market Days] Load Failure', props<{ status: number }>());

// The live screen's own read (decision 58). Unlike the list it is never cached: the screen
// is entered once per market and the day it shows changes under the vendor all morning.
export const LoadMarketDay = createAction('[Market Days] Load Day', props<{ marketId: string; date: string }>());
export const LoadMarketDaySuccess = createAction('[Market Days] Load Day Success', props<{ day: MarketDayView }>());
// 404 and 5xx land in the same place — the screen's guard state — matching the list, whose
// failed load also leaves the screen with nothing to render. The interceptor surfaces 5xx.
export const LoadMarketDayFailure = createAction('[Market Days] Load Day Failure');

export const SetMarketDayMenu = createAction(
  '[Market Days] Set Menu',
  props<{ marketId: string; date: string; itemIds: string[] }>(),
);
export const SetMarketDayMenuSuccess = createAction(
  '[Market Days] Set Menu Success',
  props<{ marketId: string; date: string; itemIds: string[] }>(),
);
export const SetMarketDayMenuFailure = createAction('[Market Days] Set Menu Failure');

export const ChangeItemAvailability = createAction(
  '[Market Days] Change Item Availability',
  props<{ marketId: string; date: string; itemId: string; soldOut: boolean }>(),
);
// Nothing to reduce on success — the patch landed on dispatch. The action exists so the
// queued effect has a completion to emit.
export const ChangeItemAvailabilitySuccess = createAction('[Market Days] Change Item Availability Success');
export const ChangeItemAvailabilityFailure = createAction(
  '[Market Days] Change Item Availability Failure',
  props<{ marketId: string; date: string; itemId: string; soldOut: boolean }>(),
);

export const ChangeStandClosure = createAction(
  '[Market Days] Change Stand Closure',
  props<{ marketId: string; date: string; closed: boolean }>(),
);
export const ChangeStandClosureSuccess = createAction('[Market Days] Change Stand Closure Success');
export const ChangeStandClosureFailure = createAction(
  '[Market Days] Change Stand Closure Failure',
  props<{ marketId: string; date: string; closed: boolean }>(),
);

// The dashboard prompt's own read (decision 65). Never cached: it is asked for once per
// dashboard visit, and what it answers changes every time a bilan is recorded.
export const LoadUnratedMarketDays = createAction('[Market Days] Load Unrated');
export const LoadUnratedMarketDaysSuccess = createAction(
  '[Market Days] Load Unrated Success',
  props<{ marketDays: UnratedMarketDay[] }>(),
);
// The prompt is a nudge, so a failed load leaves it silent rather than saying anything.
export const LoadUnratedMarketDaysFailure = createAction('[Market Days] Load Unrated Failure');

// The bilan, whole (decision 72). No optimistic patch: a whole-set save has nothing to
// show that the form is not already showing, and a failure leaves every answer standing.
// `complete` is the screen's own reading of its rows, not a count the reducer could make:
// the bilan has a row per menu item *that is still in the catalogue*, which is the same
// join the unrated query reads against, and a retired dish would make a count off the
// stored ids disagree with it.
export const RecordBilan = createAction(
  '[Market Days] Record Bilan',
  props<{ marketId: string; date: string; outcomes: Record<string, ItemOutcome>; complete: boolean }>(),
);
export const RecordBilanSuccess = createAction(
  '[Market Days] Record Bilan Success',
  props<{ marketId: string; date: string; outcomes: Record<string, ItemOutcome>; complete: boolean }>(),
);
export const RecordBilanFailure = createAction('[Market Days] Record Bilan Failure');

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
