import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { AmendMarketScheduleSuccess, RegisterMarketScheduleSuccess } from '../markets/market-schedule.state';
import { MarketDayView } from './market-days';

export const LoadMarketDays = createAction('[Market Days] Load');
export const LoadMarketDaysSuccess = createAction('[Market Days] Load Success', props<{ days: MarketDayView[] }>());
export const LoadMarketDaysFailure = createAction('[Market Days] Load Failure', props<{ status: number }>());

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

export interface MarketDayState {
  loading: boolean;
  fresh: boolean;
  days: MarketDayView[];
}

export const initialState: MarketDayState = {
  loading: false,
  fresh: false,
  days: [],
};

// A schedule change redraws which days exist, and only the API can expand the
// recurrence — so stale, not patched like the menu save below.
const wentStale = (state: MarketDayState): MarketDayState => ({ ...state, fresh: false });

const patchAvailability = (state: MarketDayState, marketId: string, date: string, itemId: string, soldOut: boolean): MarketDayState => ({
  ...state,
  days: state.days.map(day => {
    if (day.marketId !== marketId || day.date !== date) {
      return day;
    }
    const others = day.soldOutItemIds.filter(id => id !== itemId);
    return { ...day, soldOutItemIds: soldOut ? [...others, itemId] : others };
  }),
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
    // Optimistic: the response is void and the projection lags it by 4–275ms, so the day
    // takes the ids that were just sent rather than waiting for a re-read that never comes.
    // ponytail: SetMarketDayMenuFailure is unreduced — same no-error-UX stance as the
    // catalogue's siblings; the interceptor surfaces 5xx and network failures.
    on(SetMarketDayMenuSuccess, (state, { marketId, date, itemIds }): MarketDayState => ({
      ...state,
      days: state.days.map(day => (day.marketId === marketId && day.date === date ? { ...day, itemIds } : day)),
    })),
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
