import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { StorefrontFacade } from './storefront.facade';
import { EditStorefront, PublishStorefront, storefrontFeature, UploadCoverPhoto } from './storefront.state';

@Injectable()
export class StoreStorefrontFacade implements StorefrontFacade {
  private readonly store = inject(Store);

  readonly view = this.store.selectSignal(storefrontFeature.selectView);
  readonly loading = this.store.selectSignal(storefrontFeature.selectLoading);
  readonly saved = this.store.selectSignal(storefrontFeature.selectSaved);
  readonly coverPhotoUploading = this.store.selectSignal(storefrontFeature.selectCoverPhotoUploading);
  readonly coverPhotoError = this.store.selectSignal(storefrontFeature.selectCoverPhotoError);
  readonly publishing = this.store.selectSignal(storefrontFeature.selectPublishing);
  readonly publishError = this.store.selectSignal(storefrontFeature.selectPublishError);

  save(name: string, description: string, phone: string): void {
    this.store.dispatch(EditStorefront({ name, description, phone }));
  }

  uploadCoverPhoto(file: File): void {
    this.store.dispatch(UploadCoverPhoto({ file }));
  }

  publish(): void {
    this.store.dispatch(PublishStorefront());
  }
}
