import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { MarketRecord } from './selling-record';
import { RecordBilanSuccess } from '../market-days/market-day.state';

export const LoadSellingRecord = createAction('[Selling Record] Load Selling Record');
export const LoadSellingRecordSuccess = createAction(
  '[Selling Record] Load Selling Record Success',
  props<{ markets: MarketRecord[] }>(),
);
export const LoadSellingRecordFailure = createAction('[Selling Record] Load Selling Record Failure');

export interface SellingRecordState {
  loading: boolean;
  fresh: boolean;
  markets: MarketRecord[];
}

export const initialState: SellingRecordState = { loading: false, fresh: false, markets: [] };

export const sellingRecordFeature = createFeature({
  name: 'sellingRecord',
  reducer: createReducer<SellingRecordState>(
    initialState,
    on(LoadSellingRecord, (state): SellingRecordState => ({ ...state, loading: true })),
    on(LoadSellingRecordSuccess, (state, { markets }): SellingRecordState => ({ ...state, loading: false, fresh: true, markets })),
    on(LoadSellingRecordFailure, (state): SellingRecordState => ({ ...state, loading: false })),
    // Staled rather than patched: a bilan lands as outcomes keyed by item, and turning
    // that into this shape here would be a second implementation of the fold, free to
    // drift from the one the API answers with. The next screen refetches.
    on(RecordBilanSuccess, (state): SellingRecordState => ({ ...state, fresh: false })),
  ),
});
