import { Signal } from '@angular/core';
import { StorefrontView } from './storefront';
import { StorefrontAddress } from './storefront-address';

export abstract class StorefrontFacade {
  abstract readonly view: Signal<StorefrontView | undefined>;
  abstract readonly published: Signal<boolean>;
  // None until the vitrine has a subdomain.
  abstract readonly address: Signal<StorefrontAddress | null>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly saved: Signal<boolean>;
  abstract readonly coverPhotoUploading: Signal<boolean>;
  abstract readonly coverPhotoError: Signal<boolean>;
  abstract readonly publishing: Signal<boolean>;
  abstract readonly publishError: Signal<boolean>;

  abstract load(): void;
  abstract save(name: string, description: string, phone: string): void;
  abstract uploadCoverPhoto(file: File): void;
  abstract publish(): void;
  abstract setCartePricesVisible(visible: boolean): void;
}
