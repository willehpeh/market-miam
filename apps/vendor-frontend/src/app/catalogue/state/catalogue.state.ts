import { createFeature, createReducer, on } from '@ngrx/store';
import { CatalogueItemView } from '../catalogue';
import {
  AddItemSuccess,
  BeginItem,
  ChangeItemPhotoSuccess,
  LoadCatalogue,
  LoadCatalogueFailure,
  LoadCatalogueSuccess,
  ReorderItemsSuccess,
  RetireItemSuccess,
  ReviseItemSuccess,
  UploadItemPhoto,
  UploadItemPhotoFailure,
  UploadItemPhotoSuccess,
  UploadItemPhotoTooLarge
} from './catalogue.actions';

export interface CatalogueState {
  loading: boolean;
  fresh: boolean;
  items: CatalogueItemView[];
  photoUploading: boolean;
  photoError: boolean;
  photoTooLarge: boolean;
  newPhotoReference: string;
}

export const initialState: CatalogueState = {
  loading: false,
  fresh: false,
  items: [],
  photoUploading: false,
  photoError: false,
  photoTooLarge: false,
  newPhotoReference: '',
};

export const catalogueFeature = createFeature({
  name: 'catalogue',
  reducer: createReducer<CatalogueState>(
    initialState,
    on(LoadCatalogue, (state): CatalogueState => ({ ...state, loading: true })),
    on(LoadCatalogueSuccess, (state, { items }): CatalogueState => ({ ...state, loading: false, fresh: true, items })),
    // A failed load leaves the cache stale on purpose: the next screen visit retries.
    on(LoadCatalogueFailure, (state): CatalogueState => ({ ...state, loading: false })),
    on(BeginItem, (state): CatalogueState => ({ ...state, photoUploading: false, photoError: false, photoTooLarge: false, newPhotoReference: '' })),
    on(UploadItemPhoto, (state): CatalogueState => ({ ...state, photoUploading: true, photoError: false, photoTooLarge: false })),
    on(UploadItemPhotoSuccess, (state, { imageReference }): CatalogueState => ({
      ...state,
      photoUploading: false,
      newPhotoReference: imageReference,
    })),
    on(UploadItemPhotoFailure, (state): CatalogueState => ({ ...state, photoUploading: false, photoError: true })),
    on(UploadItemPhotoTooLarge, (state): CatalogueState => ({ ...state, photoUploading: false, photoTooLarge: true })),
    // ponytail: AddItemFailure is emitted but unreduced — no add-error UX yet. Wire a banner
    // into the reducer when the flow needs it (mirrors storefront's EditStorefrontFailure).
    // Optimistic: append on success so the list shows the item without waiting for the
    // projection to catch up (CatalogueList loads only when empty).
    // fresh too: the add screen is deep-linkable, so the append can land on a cold store,
    // and the appended copy is newer than the projection — a follow-up GET could only
    // clobber it.
    on(AddItemSuccess, (state, { item }): CatalogueState => ({ ...state, fresh: true, items: [...state.items, item], newPhotoReference: '' })),
    // ponytail: ReviseItemFailure is emitted but unreduced — same no-error-UX stance as AddItemFailure.
    // Optimistic: merge the revised fields by id on success, preserving the item's other fields (image).
    on(ReviseItemSuccess, (state, { itemId, name, description, price, variants }): CatalogueState => ({
      ...state,
      items: state.items.map(item => item.itemId === itemId ? { ...item, name, description, price, variants } : item),
    })),
    // ponytail: ReorderItemsFailure unreduced — the reorder screen keeps the vendor's
    // order on its own until it saves, so a failure leaves the stored order untouched
    // rather than wrong. Wire a banner in when there is an error UX to hang it on.
    on(ReorderItemsSuccess, (state, { itemIds }): CatalogueState => ({
      ...state,
      items: itemIds.flatMap(itemId => state.items.find(item => item.itemId === itemId) ?? []),
    })),
    // ponytail: RetireItemFailure unreduced — same no-error-UX stance as its siblings. The
    // item stays put and the vendor stays on the form, which is at least not a lie.
    // Optimistic: drop it on success so the list is right without waiting for the projection.
    on(RetireItemSuccess, (state, { itemId }): CatalogueState => ({
      ...state,
      items: state.items.filter(item => item.itemId !== itemId),
    })),
    // ponytail: ChangeItemPhotoFailure unreduced — same no-error-UX stance.
    on(ChangeItemPhotoSuccess, (state, { itemId, imageReference }): CatalogueState => ({
      ...state,
      items: state.items.map(item => item.itemId === itemId ? { ...item, imageReference } : item),
    })),
  ),
});
