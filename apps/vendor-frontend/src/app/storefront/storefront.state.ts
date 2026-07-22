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
export const EditStorefrontSuccess = createAction(
  '[Storefront] Edit Storefront Success',
  props<{ name: string; description: string; phone: string }>(),
);
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
export const HideSavedModal = createAction('[@Effect navigateHomeOnSaved$] Hide Saved Modal');

export const PublishStorefront = createAction('[Storefront] Publish Storefront');
export const PublishStorefrontSuccess = createAction('[Storefront] Publish Storefront Success');
export const PublishStorefrontFailure = createAction('[Storefront] Publish Storefront Failure');

export interface StorefrontState {
  loading: boolean;
  view: StorefrontView | undefined;
  saved: boolean;
  coverPhotoUploading: boolean;
  coverPhotoError: boolean;
  publishing: boolean;
  publishError: boolean;
}

export const initialState: StorefrontState = {
  loading: false,
  view: undefined,
  saved: false,
  coverPhotoUploading: false,
  coverPhotoError: false,
  publishing: false,
  publishError: false,
};

export const storefrontFeature = createFeature({
  name: 'storefront',
  reducer: createReducer<StorefrontState>(
    initialState,
    on(LoadStorefront, (state): StorefrontState => ({ ...state, loading: true, saved: false })),
    on(LoadStorefrontSuccess, (state, { view }): StorefrontState => ({ ...state, loading: false, view })),
    on(LoadStorefrontFailure, (state): StorefrontState => ({ ...state, loading: false })),
    on(EditStorefront, (state): StorefrontState => ({ ...state, saved: false })),
    on(EditStorefrontSuccess, (state, { name, description, phone }): StorefrontState => ({
      ...state,
      saved: true,
      view: { ...(state.view ?? { imageReference: '', subdomain: null, published: false }), name, description, phone },
    })),
    on(UploadCoverPhoto, (state): StorefrontState => ({ ...state, coverPhotoUploading: true, coverPhotoError: false })),
    on(UploadCoverPhotoSuccess, (state, { imageReference }): StorefrontState => ({
      ...state,
      coverPhotoUploading: false,
      view: state.view ? { ...state.view, imageReference } : state.view,
    })),
    on(UploadCoverPhotoFailure, (state): StorefrontState => ({ ...state, coverPhotoUploading: false, coverPhotoError: true })),
    on(HideSavedModal, (state): StorefrontState => ({ ...state, saved: false })),
    on(PublishStorefront, (state): StorefrontState => ({ ...state, publishing: true, publishError: false })),
    on(PublishStorefrontSuccess, (state): StorefrontState => ({
      ...state,
      publishing: false,
      view: state.view ? { ...state.view, published: true } : state.view,
    })),
    on(PublishStorefrontFailure, (state): StorefrontState => ({ ...state, publishing: false, publishError: true }))
  ),
});
