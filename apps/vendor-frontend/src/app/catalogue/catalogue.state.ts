import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { CatalogueItemView, DishRevision, NewDish } from './catalogue';

export const LoadCatalogue = createAction('[Catalogue] Load Catalogue');
export const LoadCatalogueSuccess = createAction(
  '[Catalogue] Load Catalogue Success',
  props<{ items: CatalogueItemView[] }>(),
);
export const LoadCatalogueFailure = createAction(
  '[Catalogue] Load Catalogue Failure',
  props<{ status: number }>(),
);

export const BeginDish = createAction('[Catalogue] Begin Dish');
export const UploadDishPhoto = createAction('[Catalogue] Upload Dish Photo', props<{ itemId: string; file: File }>());
export const UploadDishPhotoSuccess = createAction(
  '[Catalogue] Upload Dish Photo Success',
  props<{ imageReference: string }>(),
);
export const UploadDishPhotoFailure = createAction('[Catalogue] Upload Dish Photo Failure');
export const AddDish = createAction('[Catalogue] Add Dish', props<NewDish>());
export const AddDishSuccess = createAction('[Catalogue] Add Dish Success', props<{ item: CatalogueItemView }>());
export const AddDishFailure = createAction('[Catalogue] Add Dish Failure');
export const ReviseDish = createAction('[Catalogue] Revise Dish', props<DishRevision>());
export const ReviseDishSuccess = createAction('[Catalogue] Revise Dish Success', props<DishRevision>());
export const ReviseDishFailure = createAction('[Catalogue] Revise Dish Failure');
export const ChangeDishPhoto = createAction('[Catalogue] Change Dish Photo', props<{ itemId: string; imageReference: string }>());
export const ChangeDishPhotoSuccess = createAction('[Catalogue] Change Dish Photo Success', props<{ itemId: string; imageReference: string }>());
export const ChangeDishPhotoFailure = createAction('[Catalogue] Change Dish Photo Failure');

export interface CatalogueState {
  loading: boolean;
  items: CatalogueItemView[];
  photoUploading: boolean;
  photoError: boolean;
  newPhotoReference: string;
}

export const initialState: CatalogueState = {
  loading: false,
  items: [],
  photoUploading: false,
  photoError: false,
  newPhotoReference: '',
};

export const catalogueFeature = createFeature({
  name: 'catalogue',
  reducer: createReducer<CatalogueState>(
    initialState,
    on(LoadCatalogue, (state): CatalogueState => ({ ...state, loading: true })),
    on(LoadCatalogueSuccess, (state, { items }): CatalogueState => ({ ...state, loading: false, items })),
    on(LoadCatalogueFailure, (state): CatalogueState => ({ ...state, loading: false })),
    on(BeginDish, (state): CatalogueState => ({ ...state, photoUploading: false, photoError: false, newPhotoReference: '' })),
    on(UploadDishPhoto, (state): CatalogueState => ({ ...state, photoUploading: true, photoError: false })),
    on(UploadDishPhotoSuccess, (state, { imageReference }): CatalogueState => ({
      ...state,
      photoUploading: false,
      newPhotoReference: imageReference,
    })),
    on(UploadDishPhotoFailure, (state): CatalogueState => ({ ...state, photoUploading: false, photoError: true })),
    // ponytail: AddDishFailure is emitted but unreduced — no add-error UX yet. Wire a banner
    // into the reducer when the flow needs it (mirrors storefront's EditStorefrontFailure).
    // Optimistic: append on success so the list shows the dish without waiting for the
    // projection to catch up (CatalogueList loads only when empty).
    on(AddDishSuccess, (state, { item }): CatalogueState => ({ ...state, items: [...state.items, item], newPhotoReference: '' })),
    // ponytail: ReviseDishFailure is emitted but unreduced — same no-error-UX stance as AddDishFailure.
    // Optimistic: merge the revised fields by id on success, preserving the item's other fields (image).
    on(ReviseDishSuccess, (state, { itemId, name, description, price }): CatalogueState => ({
      ...state,
      items: state.items.map(item => item.itemId === itemId ? { ...item, name, description, price } : item),
    })),
    // ponytail: ChangeDishPhotoFailure unreduced — same no-error-UX stance.
    on(ChangeDishPhotoSuccess, (state, { itemId, imageReference }): CatalogueState => ({
      ...state,
      items: state.items.map(item => item.itemId === itemId ? { ...item, imageReference } : item),
    })),
  ),
});
