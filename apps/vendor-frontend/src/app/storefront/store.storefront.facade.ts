import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { StorefrontFacade } from './storefront.facade';
import {
  EditStorefront,
  LoadStorefront,
  PublishStorefront,
  selectAddress,
  selectPublished,
  SetCartePricesVisible,
  storefrontFeature,
  UploadCoverPhoto,
} from './storefront.state';

@Injectable()
export class StoreStorefrontFacade implements StorefrontFacade {
  private readonly store = inject(Store);

  readonly view = this.store.selectSignal(storefrontFeature.selectView);
  readonly published = this.store.selectSignal(selectPublished);
  readonly address = this.store.selectSignal(selectAddress);
  readonly loading = this.store.selectSignal(storefrontFeature.selectLoading);
  readonly saved = this.store.selectSignal(storefrontFeature.selectSaved);
  readonly coverPhotoUploading = this.store.selectSignal(storefrontFeature.selectCoverPhotoUploading);
  readonly coverPhotoError = this.store.selectSignal(storefrontFeature.selectCoverPhotoError);
  readonly publishing = this.store.selectSignal(storefrontFeature.selectPublishing);
  readonly publishError = this.store.selectSignal(storefrontFeature.selectPublishError);

  // Only an unknown storefront is asked for, and not twice at once: the sign-in asks first,
  // and a re-GET could put a projection that lags a save back over it.
  load(): void {
    if (this.view() === undefined && !this.loading()) {
      this.store.dispatch(LoadStorefront());
    }
  }

  save(name: string, description: string, phone: string): void {
    this.store.dispatch(EditStorefront({ name, description, phone }));
  }

  uploadCoverPhoto(file: File): void {
    this.store.dispatch(UploadCoverPhoto({ file }));
  }

  publish(): void {
    this.store.dispatch(PublishStorefront());
  }

  setCartePricesVisible(visible: boolean): void {
    this.store.dispatch(SetCartePricesVisible({ visible }));
  }
}
