import { createAction, createFeature, createReducer, on } from '@ngrx/store';

export const RegisterVendor = createAction('[Vendor] Register Vendor');
export const RegisterVendorSuccess = createAction('[Vendor] Register Vendor Success');
export const RegisterVendorFailure = createAction('[Vendor] Register Vendor Failure');

export interface VendorState {
  loading: boolean;
}

export const initialState: VendorState = {
  loading: false,
};

export const vendorFeature = createFeature({
  name: 'vendor',
  reducer: createReducer<VendorState>(
    initialState,
    on(RegisterVendor, (state): VendorState => ({ ...state, loading: true })),
    on(RegisterVendorSuccess, (state): VendorState => ({ ...state, loading: false })),
    on(RegisterVendorFailure, (state): VendorState => ({ ...state, loading: false })),
  ),
});
