import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { Catalogue } from './catalogue';
import { PhotoUploads } from '../storefront/photo-uploads';
import {
  AddDish,
  AddDishFailure,
  AddDishSuccess,
  catalogueFeature,
  LoadCatalogue,
  LoadCatalogueFailure,
  LoadCatalogueSuccess,
  ReviseDish,
  ReviseDishFailure,
  ReviseDishSuccess,
  ChangeDishPhoto,
  ChangeDishPhotoFailure,
  ChangeDishPhotoSuccess,
  UploadDishPhoto,
  UploadDishPhotoFailure,
  UploadDishPhotoSuccess,
} from './catalogue.state';

@Injectable()
export class CatalogueEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly catalogue = inject(Catalogue);
  private readonly photoUploads = inject(PhotoUploads);
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

  uploadDishPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadDishPhoto),
      switchMap(({ itemId, file }) =>
        this.catalogue.photoSignature(itemId).pipe(
          switchMap((signed) =>
            this.photoUploads.upload(file, signed).pipe(
              map((uploaded) =>
                UploadDishPhotoSuccess({ itemId, imageReference: `v${uploaded.version}/${uploaded.publicId}` }),
              ),
            ),
          ),
          catchError(() => of(UploadDishPhotoFailure())),
        ),
      ),
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
      switchMap(({ itemId, name, description, price, imageReference }) =>
        this.catalogue.add({ itemId, name, description, price, imageReference }).pipe(
          map(() => AddDishSuccess({ item: { itemId, name, description, price, imageReference: imageReference ?? '' } })),
          catchError(() => of(AddDishFailure())),
        ),
      ),
    ),
  );

  reviseDish$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReviseDish),
      switchMap(({ itemId, name, description, price }) => {
        const revision = { itemId, name, description, price };
        return this.catalogue.revise(revision).pipe(
          map(() => ReviseDishSuccess(revision)),
          catchError(() => of(ReviseDishFailure())),
        );
      }),
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
