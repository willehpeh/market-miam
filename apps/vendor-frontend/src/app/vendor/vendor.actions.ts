import { createAction, props } from '@ngrx/store';

export const RegisterVendor = createAction('[Vendor] Register Vendor');
export const RegisterVendorSuccess = createAction('[Vendor] Register Vendor Success');
export const RegisterVendorFailure = createAction(
  '[Vendor] Register Vendor Failure',
  props<{ status: number }>(),
);
