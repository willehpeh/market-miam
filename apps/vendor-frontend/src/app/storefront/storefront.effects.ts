import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, retry, switchMap, throwError, timer } from 'rxjs';
import { Storefront } from './storefront';
import { PhotoUploads } from './photo-uploads';
import {
  EditStorefront,
  EditStorefrontFailure,
  EditStorefrontSuccess,
  LoadStorefront,
  LoadStorefrontFailure,
  LoadStorefrontSuccess,
  PublishStorefront,
  PublishStorefrontFailure,
  PublishStorefrontSuccess,
  SetCartePricesVisible,
  SetCartePricesVisibleFailure,
  SetCartePricesVisibleSuccess,
  UploadCoverPhoto,
  UploadCoverPhotoFailure,
  UploadCoverPhotoSuccess,
} from './storefront.state';

export interface StorefrontRetry {
  delayMs: number;
  maxAttempts: number;
}

// ponytail: retry window absorbing the registration→projection lag (GET 404s until the view is projected).
// Tune delayMs × maxAttempts to the consumer poll cadence; per-error, 404-only so real failures fail fast.
export const STOREFRONT_RETRY = new InjectionToken<StorefrontRetry>('storefront.retry', {
  factory: () => ({ delayMs: 1000, maxAttempts: 10 }),
});

@Injectable()
export class StorefrontEffects {
  private readonly actions$ = inject(Actions);
  private readonly storefront = inject(Storefront);
  private readonly photoUploads = inject(PhotoUploads);
  private readonly retry = inject(STOREFRONT_RETRY);

  loadStorefront$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoadStorefront),
      switchMap(() =>
        this.storefront.view().pipe(
          retry({
            delay: (error: HttpErrorResponse, attempt) =>
              error.status === 404 && attempt <= this.retry.maxAttempts
                ? timer(this.retry.delayMs)
                : throwError(() => error),
          }),
          map((view) => LoadStorefrontSuccess({ view })),
          catchError((error: HttpErrorResponse) => of(LoadStorefrontFailure({ status: error.status }))),
        ),
      ),
    ),
  );

  // ponytail: EditStorefrontFailure is emitted but unreduced — no error UX yet.
  // Wire an error banner into the reducer when the flow needs it.
  editStorefront$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EditStorefront),
      switchMap(({ name, description, phone }) =>
        this.storefront.edit(name, description, phone).pipe(
          map(() => EditStorefrontSuccess({ name, description, phone })),
          catchError(() => of(EditStorefrontFailure())),
        ),
      ),
    ),
  );

  uploadCoverPhoto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UploadCoverPhoto),
      switchMap(({ file }) =>
        this.storefront.coverPhotoSignature().pipe(
          switchMap((signed) =>
            this.photoUploads.upload(file, signed).pipe(
              switchMap((uploaded) =>
                this.storefront.setCoverPhoto(uploaded.version).pipe(
                  map(() =>
                    UploadCoverPhotoSuccess({
                      imageReference: `v${uploaded.version}/${uploaded.publicId}`,
                    }),
                  ),
                ),
              ),
            ),
          ),
          catchError(() => of(UploadCoverPhotoFailure())),
        ),
      ),
    ),
  );

  // The reducer has already flipped the view; this only has to put it back if the write
  // does not land, which is why the failure carries the value to restore.
  setCartePricesVisible$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SetCartePricesVisible),
      switchMap(({ visible }) =>
        this.storefront.setCartePricesVisible(visible).pipe(
          map(() => SetCartePricesVisibleSuccess()),
          catchError(() => of(SetCartePricesVisibleFailure({ visible: !visible }))),
        ),
      ),
    ),
  );

  publishStorefront$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PublishStorefront),
      switchMap(() =>
        this.storefront.publish().pipe(
          map(() => PublishStorefrontSuccess()),
          catchError(() => of(PublishStorefrontFailure())),
        ),
      ),
    ),
  );
}
