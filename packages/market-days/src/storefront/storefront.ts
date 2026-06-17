import { Aggregate } from '@market-monster/event-sourcing';
import { ImageReference } from '@market-monster/common';
import { StorefrontCoverPhotoSet, StorefrontEvent } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';

export class Storefront extends Aggregate {

  private _coverPhoto: CoverPhoto = new NoCoverPhoto();

  apply(event: StorefrontEvent): void {
    switch (event.type) {
      case 'StorefrontCoverPhotoSet':
        this._coverPhoto = new SetCoverPhoto(new ImageReference(event.payload.imageReference));
        break;
    }
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
}
