import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { StorefrontView } from './storefront';

export const LoadStorefront = createAction('[Storefront] Load Storefront');
export const LoadStorefrontSuccess = createAction(
  '[Storefront] Load Storefront Success',
  props<{ view: StorefrontView }>(),
);
export const LoadStorefrontFailure = createAction(
  '[Storefront] Load Storefront Failure',
  props<{ status: number }>(),
);

export const EditStorefront = createAction(
  '[Storefront] Edit Storefront',
  props<{ name: string; description: string; phone: string }>(),
);
export const EditStorefrontSuccess = createAction('[Storefront] Edit Storefront Success');
export const EditStorefrontFailure = createAction('[Storefront] Edit Storefront Failure');

export interface StorefrontState {
  loading: boolean;
  view: StorefrontView | undefined;
}

export const initialState: StorefrontState = {
  loading: false,
  view: undefined,
};

export const storefrontFeature = createFeature({
  name: 'storefront',
  reducer: createReducer<StorefrontState>(
    initialState,
    on(LoadStorefront, (state): StorefrontState => ({ ...state, loading: true })),
    on(LoadStorefrontSuccess, (_state, { view }): StorefrontState => ({ loading: false, view })),
    on(LoadStorefrontFailure, (state): StorefrontState => ({ ...state, loading: false })),
  ),
});
