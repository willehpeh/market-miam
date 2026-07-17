import { Aggregate } from '@market-miam/event-sourcing';
import { ImageReference, PhoneNumber } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited, StorefrontOpened, StorefrontPublished } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';
import { StorefrontNotOpenError } from './storefront-not-open.error';

export class Storefront extends Aggregate {

  private _opened = false;
  private _coverPhoto: CoverPhoto = new NoCoverPhoto();
  private _name?: StorefrontName;
  private _description: StorefrontDescription = new StorefrontDescription('');
  private _published = false;

  apply(event: StorefrontEvent): void {
    switch (event.type) {
      case 'StorefrontOpened':
        this._opened = true;
        break;
      case 'StorefrontCoverPhotoSet':
        this._coverPhoto = new SetCoverPhoto(new ImageReference(event.payload.imageReference));
        break;
      case 'StorefrontInformationEdited':
        this._name = new StorefrontName(event.payload.name);
        this._description = new StorefrontDescription(event.payload.description);
        break;
      case 'StorefrontPublished':
        this._published = true;
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

  editInformation(name: StorefrontName, description: StorefrontDescription, phone: PhoneNumber) {
    this.assertOpen();
    const event: StorefrontInformationEdited = {
      type: 'StorefrontInformationEdited',
      payload: {
        name: name.value(),
        description: description.value(),
        phone: phone.value()
      },
      version: 1
    };
    this.raise(event);
  }

  publish() {
    if (this._published) {
      return;
    }
    const event: StorefrontPublished = {
      type: 'StorefrontPublished',
      payload: {},
      version: 1
    };
    this.raise(event);
  }

  hasTitle(): boolean {
    return this._name !== undefined;
  }

  hasDescription(): boolean {
    return this._description.hasContent();
  }

  hasCoverPhoto(): boolean {
    return this._coverPhoto.isSet();
  }

  private assertOpen() {
    if (!this._opened) {
      throw new StorefrontNotOpenError();
    }
  }
}
