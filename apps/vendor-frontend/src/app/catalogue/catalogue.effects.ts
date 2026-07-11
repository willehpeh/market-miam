import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { Catalogue } from './catalogue';
import { PhotoUploads } from '../storefront/photo-uploads';
import {
  AddDish,
  AddDishFailure,
  AddDishSuccess,
  LoadCatalogue,
  LoadCatalogueFailure,
  LoadCatalogueSuccess,
  UploadDishPhoto,
  UploadDishPhotoFailure,
  UploadDishPhotoSuccess,
} from './catalogue.state';

@Injectable()
export class CatalogueEffects {
  private readonly actions$ = inject(Actions);
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
                UploadDishPhotoSuccess({ imageReference: `v${uploaded.version}/${uploaded.publicId}` }),
              ),
            ),
          ),
          catchError(() => of(UploadDishPhotoFailure())),
        ),
      ),
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

  navigateOnAdded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AddDishSuccess),
        tap(() => {
          this.router.navigate(['/dashboard/catalogue']);
        }),
      ),
    { dispatch: false },
  );
}
