import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export const EraseVendor = createAction('[Erasures] Erase Vendor', props<{ vendorId: string }>());
export const EraseVendorAccepted = createAction('[Erasures] Erase Vendor Accepted', props<{ vendorId: string }>());

export interface ErasureState {
  // The vendor whose erasure the api has not answered yet.
  erasing: string | null;
}

export const initialState: ErasureState = {
  erasing: null,
};

export const erasureFeature = createFeature({
  name: 'erasure',
  reducer: createReducer<ErasureState>(
    initialState,
    on(EraseVendor, (state, { vendorId }): ErasureState => ({ ...state, erasing: vendorId })),
    on(EraseVendorAccepted, (state): ErasureState => ({ ...state, erasing: null })),
  ),
});
