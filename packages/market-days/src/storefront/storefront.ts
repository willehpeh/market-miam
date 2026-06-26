import { Aggregate } from '@market-monster/event-sourcing';
import { ImageReference } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited, StorefrontOpened } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';

export class Storefront extends Aggregate {

  private _coverPhoto: CoverPhoto = new NoCoverPhoto();

  apply(event: StorefrontEvent): void {
    switch (event.type) {
      case 'StorefrontCoverPhotoSet':
        this._coverPhoto = new SetCoverPhoto(new ImageReference(event.payload.imageReference));
        break;
    }
  }

  open(vendorId: VendorId) {
    const event: StorefrontOpened = {
      type: 'StorefrontOpened',
      payload: { vendorId: vendorId.value() }
    };
    this.raise(event);
  }

  setCoverPhoto(imageReference: ImageReference) {
    if (this._coverPhoto.sameAs(imageReference)) {
      return;
    }
    const event: StorefrontCoverPhotoSet = {
      type: 'StorefrontCoverPhotoSet',
      payload: { imageReference: imageReference.value() }
    };
    this.raise(event);
  }

  editInformation(name: StorefrontName, description: StorefrontDescription) {
    const event: StorefrontInformationEdited = {
      type: 'StorefrontInformationEdited',
      payload: {
        name: name.value(),
        description: description.value()
      }
    };
    this.raise(event);
  }
}
