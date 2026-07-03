import { Aggregate } from '@market-monster/event-sourcing';
import { ImageReference } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited, StorefrontOpened } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';
import { StorefrontNotOpenError } from './storefront-not-open.error';

export class Storefront extends Aggregate {

  private _opened = false;
  private _coverPhoto: CoverPhoto = new NoCoverPhoto();

  apply(event: StorefrontEvent): void {
    switch (event.type) {
      case 'StorefrontOpened':
        this._opened = true;
        break;
      case 'StorefrontCoverPhotoSet':
        this._coverPhoto = new SetCoverPhoto(new ImageReference(event.payload.imageReference));
        break;
    }
  }

  open(vendorId: VendorId) {
    if (this._opened) {
      return;
    }
    const event: StorefrontOpened = {
      type: 'StorefrontOpened',
      payload: { vendorId: vendorId.value() },
      version: 1
    };
    this.raise(event);
  }

  setCoverPhoto(imageReference: ImageReference) {
    this.assertOpen();
    if (this._coverPhoto.sameAs(imageReference)) {
      return;
    }
    const event: StorefrontCoverPhotoSet = {
      type: 'StorefrontCoverPhotoSet',
      payload: { imageReference: imageReference.value() },
      version: 1
    };
    this.raise(event);
  }

  editInformation(name: StorefrontName, description: StorefrontDescription) {
    this.assertOpen();
    const event: StorefrontInformationEdited = {
      type: 'StorefrontInformationEdited',
      payload: {
        name: name.value(),
        description: description.value()
      },
      version: 1
    };
    this.raise(event);
  }

  private assertOpen() {
    if (!this._opened) {
      throw new StorefrontNotOpenError();
    }
  }
}
