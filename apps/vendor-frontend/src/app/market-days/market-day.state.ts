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

export interface MarketDayState {
  loading: boolean;
  loaded: boolean;
  days: MarketDayView[];
}

export const initialState: MarketDayState = {
  loading: false,
  loaded: false,
  days: [],
};

export const marketDayFeature = createFeature({
  name: 'marketDays',
  reducer: createReducer<MarketDayState>(
    initialState,
    on(LoadMarketDays, (state): MarketDayState => ({ ...state, loading: true })),
    on(LoadMarketDaysSuccess, (state, { days }): MarketDayState => ({ ...state, loading: false, loaded: true, days })),
    on(LoadMarketDaysFailure, (state): MarketDayState => ({ ...state, loading: false, loaded: true })),
    // Optimistic: the response is void and the projection lags it by 4–275ms, so the day
    // takes the ids that were just sent rather than waiting for a re-read that never comes.
    // ponytail: SetMarketDayMenuFailure is unreduced — same no-error-UX stance as the
    // catalogue's siblings; the interceptor surfaces 5xx and network failures.
    on(SetMarketDayMenuSuccess, (state, { marketId, date, itemIds }): MarketDayState => ({
      ...state,
      days: state.days.map(day => (day.marketId === marketId && day.date === date ? { ...day, itemIds } : day)),
    })),
    // A schedule change redraws which days exist, and only the API can expand the
    // recurrence — so no optimistic patch here; the warm flag drops and the next load()
    // asks again. The stale days stay in place until then: the dashboard holds its
    // spinner on loading, so they never paint.
    on(RegisterMarketScheduleSuccess, AmendMarketScheduleSuccess, (state): MarketDayState => ({ ...state, loaded: false })),
  ),
});
