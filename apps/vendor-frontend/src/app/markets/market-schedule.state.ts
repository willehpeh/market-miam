import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { MarketScheduleView } from './market-schedules';

export const LoadMarketSchedules = createAction('[Market Schedules] Load');
export const LoadMarketSchedulesSuccess = createAction(
  '[Market Schedules] Load Success',
  props<{ schedules: MarketScheduleView[] }>(),
);
export const LoadMarketSchedulesFailure = createAction(
  '[Market Schedules] Load Failure',
  props<{ status: number }>(),
);

export const RegisterMarketSchedule = createAction(
  '[Market Schedules] Register',
  props<{ schedule: MarketScheduleView }>(),
);
export const RegisterMarketScheduleSuccess = createAction(
  '[Market Schedules] Register Success',
  props<{ schedule: MarketScheduleView }>(),
);
export const RegisterMarketScheduleFailure = createAction('[Market Schedules] Register Failure');

export const AmendMarketSchedule = createAction(
  '[Market Schedules] Amend',
  props<{ schedule: MarketScheduleView }>(),
);
export const AmendMarketScheduleSuccess = createAction(
  '[Market Schedules] Amend Success',
  props<{ schedule: MarketScheduleView }>(),
);
export const AmendMarketScheduleFailure = createAction('[Market Schedules] Amend Failure');

export interface MarketScheduleState {
  loading: boolean;
  schedules: MarketScheduleView[];
}

export const initialState: MarketScheduleState = {
  loading: false,
  schedules: [],
};

export const marketScheduleFeature = createFeature({
  name: 'marketSchedules',
  reducer: createReducer<MarketScheduleState>(
    initialState,
    on(LoadMarketSchedules, (state): MarketScheduleState => ({ ...state, loading: true })),
    on(LoadMarketSchedulesSuccess, (state, { schedules }): MarketScheduleState => ({ ...state, loading: false, schedules })),
    on(LoadMarketSchedulesFailure, (state): MarketScheduleState => ({ ...state, loading: false })),
    // ponytail: optimistic — append on success so the list shows the new schedule
    // without waiting for the projection to catch up. RegisterMarketScheduleFailure is
    // unreduced; the global error interceptor surfaces 5xx/network.
    on(RegisterMarketScheduleSuccess, (state, { schedule }): MarketScheduleState => ({ ...state, schedules: [...state.schedules, schedule] })),
    // ponytail: optimistic — replace the amended row by id so the edit shows immediately.
    on(AmendMarketScheduleSuccess, (state, { schedule }): MarketScheduleState => ({
      ...state,
      schedules: state.schedules.map((existing) => (existing.scheduleId === schedule.scheduleId ? schedule : existing)),
    })),
  ),
});
