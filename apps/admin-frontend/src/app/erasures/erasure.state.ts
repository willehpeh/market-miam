import { createAction, createFeature, createReducer, props } from '@ngrx/store';

export const EraseVendor = createAction('[Erasures] Erase Vendor', props<{ vendorId: string }>());

export const initialState: Record<string, never> = {};

export const erasureFeature = createFeature({
  name: 'erasure',
  reducer: createReducer(initialState),
});
