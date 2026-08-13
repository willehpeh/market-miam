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
  AddItem,
  AddItemFailure,
  AddItemSuccess,
  catalogueFeature,
  LoadCatalogue,
  LoadCatalogueFailure,
  LoadCatalogueSuccess,
  ReorderItems,
  ReorderItemsFailure,
  ReorderItemsSuccess,
  RetireItem,
  RetireItemFailure,
  RetireItemSuccess,
  ReviseItem,
  ReviseItemFailure,
  ReviseItemSuccess,
  ChangeItemPhoto,
  ChangeItemPhotoFailure,
  ChangeItemPhotoSuccess,
  UploadItemPhoto,
  UploadItemPhotoFailure,
  UploadItemPhotoSuccess,
  UploadItemPhotoTooLarge,
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
  uploadItemPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadItemPhoto),
      switchMap(({ itemId, file }) => {
        if (file.size > MAX_SOURCE_BYTES) {
          return of(UploadItemPhotoTooLarge());
        }
        return this.downscale.shrink(file).pipe(
          switchMap((prepared) =>
            // Only a photo that came back undecoded can still be over the ceiling.
            prepared.size > MAX_UPLOAD_BYTES
              ? of(UploadItemPhotoTooLarge())
              : this.catalogue.photoSignature(itemId).pipe(
                  switchMap((signed) =>
                    this.photoUploads.upload(prepared, signed).pipe(
                      map((uploaded) =>
                        UploadItemPhotoSuccess({ itemId, imageReference: `v${uploaded.version}/${uploaded.publicId}` }),
                      ),
                    ),
                  ),
                ),
          ),
          catchError(() => of(UploadItemPhotoFailure())),
        );
      }),
    ),
  );

  // Persist the photo the moment it finishes uploading, but only for an item that already
  // exists in the catalogue (an edit). A brand-new item isn't in the store yet, so its photo
  // rides along in the AddItem payload instead of a standalone PUT.
  persistUploadedPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadItemPhotoSuccess),
      withLatestFrom(this.store.select(catalogueFeature.selectItems)),
      filter(([{ itemId }, items]) => items.some((item) => item.itemId === itemId)),
      map(([{ itemId, imageReference }]) => ChangeItemPhoto({ itemId, imageReference })),
    ),
  );

  addItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AddItem),
      switchMap(({ itemId, name, description, price, imageReference, variants }) =>
        this.catalogue.add({ itemId, name, description, price, imageReference, variants }).pipe(
          map(() => AddItemSuccess({ item: { itemId, name, description, price, imageReference: imageReference ?? '', variants } })),
          catchError(() => of(AddItemFailure())),
        ),
      ),
    ),
  );

  reviseItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReviseItem),
      switchMap(({ itemId, name, description, price, variants }) => {
        const revision = { itemId, name, description, price, variants };
        return this.catalogue.revise(revision).pipe(
          map(() => ReviseItemSuccess(revision)),
          catchError(() => of(ReviseItemFailure())),
        );
      }),
    ),
  );

  reorderItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReorderItems),
      switchMap(({ itemIds }) =>
        this.catalogue.reorder(itemIds).pipe(
          map(() => ReorderItemsSuccess({ itemIds })),
          catchError(() => of(ReorderItemsFailure())),
        ),
      ),
    ),
  );

  retireItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RetireItem),
      switchMap(({ itemId }) =>
        this.catalogue.retire(itemId).pipe(
          map(() => RetireItemSuccess({ itemId })),
          catchError(() => of(RetireItemFailure())),
        ),
      ),
    ),
  );

  changeItemPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChangeItemPhoto),
      switchMap(({ itemId, imageReference }) =>
        this.catalogue.changePhoto(itemId, imageReference).pipe(
          map(() => ChangeItemPhotoSuccess({ itemId, imageReference })),
          catchError(() => of(ChangeItemPhotoFailure())),
        ),
      ),
    ),
  );

  navigateOnAdded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AddItemSuccess, ReviseItemSuccess, ReorderItemsSuccess, RetireItemSuccess),
        tap(() => {
          void this.router.navigate(['/dashboard/catalogue']);
        }),
      ),
    { dispatch: false },
  );
}
