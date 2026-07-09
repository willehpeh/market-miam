import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { CatalogueItemView } from './catalogue';

export const LoadCatalogue = createAction('[Catalogue] Load Catalogue');
export const LoadCatalogueSuccess = createAction(
  '[Catalogue] Load Catalogue Success',
  props<{ items: CatalogueItemView[] }>(),
);
export const LoadCatalogueFailure = createAction(
  '[Catalogue] Load Catalogue Failure',
  props<{ status: number }>(),
);

export interface CatalogueState {
  loading: boolean;
  items: CatalogueItemView[];
}

export const initialState: CatalogueState = {
  loading: false,
  items: [],
};

export const catalogueFeature = createFeature({
  name: 'catalogue',
  reducer: createReducer<CatalogueState>(
    initialState,
    on(LoadCatalogue, (state): CatalogueState => ({ ...state, loading: true })),
    on(LoadCatalogueSuccess, (state, { items }): CatalogueState => ({ ...state, loading: false, items })),
    on(LoadCatalogueFailure, (state): CatalogueState => ({ ...state, loading: false })),
  ),
});
