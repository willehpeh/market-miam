import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { Catalogue } from './catalogue';
import { PhotoUploads } from '../storefront/photo-uploads';
import { MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES, PhotoDownscale } from '../storefront/photo-downscale';
import {
  AddDish,
  AddDishFailure,
  AddDishSuccess,
  catalogueFeature,
  LoadCatalogue,
  LoadCatalogueFailure,
  LoadCatalogueSuccess,
  ReorderDishes,
  ReorderDishesFailure,
  ReorderDishesSuccess,
  ReviseDish,
  ReviseDishFailure,
  ReviseDishSuccess,
  ChangeDishPhoto,
  ChangeDishPhotoFailure,
  ChangeDishPhotoSuccess,
  UploadDishPhoto,
  UploadDishPhotoFailure,
  UploadDishPhotoSuccess,
  UploadDishPhotoTooLarge,
} from './catalogue.state';

@Injectable()
export class CatalogueEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly catalogue = inject(Catalogue);
  private readonly photoUploads = inject(PhotoUploads);
  private readonly downscale = inject(PhotoDownscale);
  private readonly router = inject(Router);

  loadCatalogue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadCatalogue),
      switchMap(() =>
        this.catalogue.list().pipe(
          map(({ items }) => LoadCatalogueSuccess({ items })),
          catchError((error: HttpErrorResponse) => of(LoadCatalogueFailure({ status: error.status }))),
        ),
      ),
    ),
  );

  // Every size judgment lives here rather than in the form, because the only size that
  // matters is the one *after* shrinking: a 12 Mo photo off the roll leaves here at a few
  // hundred Ko. Shrinking on this side of the dispatch also means the spinner is already
  // up while the phone spends its half-second decoding and re-encoding.
  uploadDishPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadDishPhoto),
      switchMap(({ itemId, file }) => {
        if (file.size > MAX_SOURCE_BYTES) {
          return of(UploadDishPhotoTooLarge());
        }
        return this.downscale.shrink(file).pipe(
          switchMap((prepared) =>
            // Only a photo that came back undecoded can still be over the ceiling.
            prepared.size > MAX_UPLOAD_BYTES
              ? of(UploadDishPhotoTooLarge())
              : this.catalogue.photoSignature(itemId).pipe(
                  switchMap((signed) =>
                    this.photoUploads.upload(prepared, signed).pipe(
                      map((uploaded) =>
                        UploadDishPhotoSuccess({ itemId, imageReference: `v${uploaded.version}/${uploaded.publicId}` }),
                      ),
                    ),
                  ),
                ),
          ),
          catchError(() => of(UploadDishPhotoFailure())),
        );
      }),
    ),
  );

  // Persist the photo the moment it finishes uploading, but only for a dish that already
  // exists in the catalogue (an edit). A brand-new dish isn't in the store yet, so its photo
  // rides along in the AddDish payload instead of a standalone PUT.
  persistUploadedPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadDishPhotoSuccess),
      withLatestFrom(this.store.select(catalogueFeature.selectItems)),
      filter(([{ itemId }, items]) => items.some((item) => item.itemId === itemId)),
      map(([{ itemId, imageReference }]) => ChangeDishPhoto({ itemId, imageReference })),
    ),
  );

  addDish$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AddDish),
      switchMap(({ itemId, name, description, price, imageReference, variants }) =>
        this.catalogue.add({ itemId, name, description, price, imageReference, variants }).pipe(
          map(() => AddDishSuccess({ item: { itemId, name, description, price, imageReference: imageReference ?? '', variants } })),
          catchError(() => of(AddDishFailure())),
        ),
      ),
    ),
  );

  reviseDish$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReviseDish),
      switchMap(({ itemId, name, description, price, variants }) => {
        const revision = { itemId, name, description, price, variants };
        return this.catalogue.revise(revision).pipe(
          map(() => ReviseDishSuccess(revision)),
          catchError(() => of(ReviseDishFailure())),
        );
      }),
    ),
  );

  reorderDishes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReorderDishes),
      switchMap(({ itemIds }) =>
        this.catalogue.reorder(itemIds).pipe(
          map(() => ReorderDishesSuccess({ itemIds })),
          catchError(() => of(ReorderDishesFailure())),
        ),
      ),
    ),
  );

  changeDishPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChangeDishPhoto),
      switchMap(({ itemId, imageReference }) =>
        this.catalogue.changePhoto(itemId, imageReference).pipe(
          map(() => ChangeDishPhotoSuccess({ itemId, imageReference })),
          catchError(() => of(ChangeDishPhotoFailure())),
        ),
      ),
    ),
  );

  navigateOnAdded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AddDishSuccess, ReviseDishSuccess),
        tap(() => {
          this.router.navigate(['/dashboard/catalogue']);
        }),
      ),
    { dispatch: false },
  );
}
