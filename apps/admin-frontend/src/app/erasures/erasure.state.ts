import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export const EraseVendor = createAction('[Erasures] Erase Vendor', props<{ vendorId: string }>());
export const EraseVendorAccepted = createAction('[Erasures] Erase Vendor Accepted', props<{ vendorId: string }>());
export const EraseVendorFailed = createAction('[Erasures] Erase Vendor Failed', props<{ vendorId: string }>());

export interface ErasureState {
  // The vendor whose erasure the api has not answered yet.
  erasing: string | null;
  // The vendor whose last erasure did not go, until the next one starts.
  failed: string | null;
}

export const initialState: ErasureState = {
  erasing: null,
  failed: null,
};

export const erasureFeature = createFeature({
  name: 'erasure',
  reducer: createReducer<ErasureState>(
    initialState,
    on(EraseVendor, (state, { vendorId }): ErasureState => ({ ...state, erasing: vendorId, failed: null })),
    on(EraseVendorAccepted, (state): ErasureState => ({ ...state, erasing: null })),
    on(EraseVendorFailed, (state, { vendorId }): ErasureState => ({ ...state, erasing: null, failed: vendorId })),
  ),
});
