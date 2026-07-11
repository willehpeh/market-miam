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
  ),
});
