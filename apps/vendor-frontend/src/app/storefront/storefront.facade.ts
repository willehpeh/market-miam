import { Signal } from '@angular/core';
import { StorefrontView } from './storefront';

export abstract class StorefrontFacade {
  abstract readonly view: Signal<StorefrontView | undefined>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly saved: Signal<boolean>;
  abstract readonly coverPhotoUploading: Signal<boolean>;
  abstract readonly coverPhotoError: Signal<boolean>;

  abstract save(name: string, description: string, phone: string): void;
  abstract uploadCoverPhoto(file: File): void;
}
