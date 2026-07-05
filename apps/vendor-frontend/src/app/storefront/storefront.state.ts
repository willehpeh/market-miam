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

export const UploadCoverPhoto = createAction(
  '[Storefront] Upload Cover Photo',
  props<{ file: File }>(),
);
export const UploadCoverPhotoSuccess = createAction(
  '[Storefront] Upload Cover Photo Success',
  props<{ imageReference: string }>(),
);
export const UploadCoverPhotoFailure = createAction('[Storefront] Upload Cover Photo Failure');

export interface StorefrontState {
  loading: boolean;
  view: StorefrontView | undefined;
  coverPhotoUploading: boolean;
  coverPhotoError: boolean;
}

export const initialState: StorefrontState = {
  loading: false,
  view: undefined,
  coverPhotoUploading: false,
  coverPhotoError: false,
};

export const storefrontFeature = createFeature({
  name: 'storefront',
  reducer: createReducer<StorefrontState>(
    initialState,
    on(LoadStorefront, (state): StorefrontState => ({ ...state, loading: true })),
    on(LoadStorefrontSuccess, (state, { view }): StorefrontState => ({ ...state, loading: false, view })),
    on(LoadStorefrontFailure, (state): StorefrontState => ({ ...state, loading: false })),
    on(UploadCoverPhoto, (state): StorefrontState => ({ ...state, coverPhotoUploading: true, coverPhotoError: false })),
    on(UploadCoverPhotoSuccess, (state, { imageReference }): StorefrontState => ({
      ...state,
      coverPhotoUploading: false,
      view: state.view ? { ...state.view, imageReference } : state.view,
    })),
    on(UploadCoverPhotoFailure, (state): StorefrontState => ({ ...state, coverPhotoUploading: false, coverPhotoError: true })),
  ),
});
