import { Aggregate, DomainEvent } from '@market-monster/event-sourcing';
import { ImageReference } from '@market-monster/common';
import { StorefrontCoverPhotoSet, StorefrontEvent } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';

type StorefrontInformationEdited = DomainEvent<'StorefrontInformationEdited', {
  name: string;
  description: string;
}>

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
