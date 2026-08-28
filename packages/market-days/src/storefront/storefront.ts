import { Aggregate } from '@market-miam/event-sourcing';
import { ImageReference, PhoneNumber } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { CartePricesHidden, CartePricesShown, StorefrontCoverPhotoSet, StorefrontEvent, StorefrontInformationEdited, StorefrontOpened, StorefrontPublished } from './events';
import { CoverPhoto, NoCoverPhoto, SetCoverPhoto } from './cover-photo';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';
import { StorefrontNotOpenError } from './storefront-not-open.error';

export class Storefront extends Aggregate {

  private _opened = false;
  private _coverPhoto: CoverPhoto = new NoCoverPhoto();
  private _name?: StorefrontName;
  private _published = false;
  // Opted in: a vitrine that has never said otherwise quotes its prices.
  private _cartePricesVisible = true;

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
        break;
      case 'StorefrontPublished':
        this._published = true;
        break;
      case 'CartePricesHidden':
        this._cartePricesVisible = false;
        break;
      case 'CartePricesShown':
        this._cartePricesVisible = true;
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

  hideCartePrices() {
    this.assertOpen();
    if (!this._cartePricesVisible) {
      return;
    }
    const event: CartePricesHidden = {
      type: 'CartePricesHidden',
      payload: {},
      version: 1
    };
    this.raise(event);
  }

  showCartePrices() {
    const event: CartePricesShown = {
      type: 'CartePricesShown',
      payload: {},
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

  hasCoverPhoto(): boolean {
    return this._coverPhoto.isSet();
  }

  private assertOpen() {
    if (!this._opened) {
      throw new StorefrontNotOpenError();
    }
  }
}
