import { createAction, props } from '@ngrx/store';
import { CatalogueItemView, ItemRevision, NewItem } from '../catalogue';

export const LoadCatalogue = createAction('[Catalogue] Load Catalogue');
export const LoadCatalogueSuccess = createAction(
  '[Catalogue] Load Catalogue Success',
  props<{ items: CatalogueItemView[] }>()
);
export const LoadCatalogueFailure = createAction(
  '[Catalogue] Load Catalogue Failure',
  props<{ status: number }>()
);
export const BeginItem = createAction('[Catalogue] Begin Item');
export const UploadItemPhoto = createAction('[Catalogue] Upload Item Photo', props<{ itemId: string; file: File }>());
export const UploadItemPhotoSuccess = createAction(
  '[Catalogue] Upload Item Photo Success',
  props<{ itemId: string; imageReference: string }>()
);
export const UploadItemPhotoFailure = createAction('[Catalogue] Upload Item Photo Failure');
export const UploadItemPhotoTooLarge = createAction('[Catalogue] Upload Item Photo Too Large');
export const AddItem = createAction('[Catalogue] Add Item', props<NewItem>());
export const AddItemSuccess = createAction('[Catalogue] Add Item Success', props<{ item: CatalogueItemView }>());
export const AddItemFailure = createAction('[Catalogue] Add Item Failure');
export const ReviseItem = createAction('[Catalogue] Revise Item', props<ItemRevision>());
export const ReviseItemSuccess = createAction('[Catalogue] Revise Item Success', props<ItemRevision>());
export const ReviseItemFailure = createAction('[Catalogue] Revise Item Failure');
export const ReorderItems = createAction('[Catalogue] Reorder Items', props<{ itemIds: string[] }>());
export const ReorderItemsSuccess = createAction('[Catalogue] Reorder Items Success', props<{ itemIds: string[] }>());
export const ReorderItemsFailure = createAction('[Catalogue] Reorder Items Failure');
export const RetireItem = createAction('[Catalogue] Retire Item', props<{ itemId: string }>());
export const RetireItemSuccess = createAction('[Catalogue] Retire Item Success', props<{ itemId: string }>());
export const RetireItemFailure = createAction('[Catalogue] Retire Item Failure');
export const ChangeItemPhoto = createAction('[Catalogue] Change Item Photo', props<{
  itemId: string;
  imageReference: string
}>());
export const ChangeItemPhotoSuccess = createAction('[Catalogue] Change Item Photo Success', props<{
  itemId: string;
  imageReference: string
}>());
export const ChangeItemPhotoFailure = createAction('[Catalogue] Change Item Photo Failure');
