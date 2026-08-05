import { Signal } from '@angular/core';
import { StorefrontView } from './storefront';

export abstract class StorefrontFacade {
  abstract readonly view: Signal<StorefrontView | undefined>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly saved: Signal<boolean>;
  abstract readonly coverPhotoUploading: Signal<boolean>;
  abstract readonly coverPhotoError: Signal<boolean>;
  abstract readonly publishing: Signal<boolean>;
  abstract readonly publishError: Signal<boolean>;
  /**
   * Where a page beneath the vitrine sends the vendor back to. Mid-setup they arrived
   * from the steps on the dashboard and have never opened the management hub, so
   * returning them there would drop them in a room they have never been in.
   */
  abstract readonly backTo: Signal<string>;

  abstract save(name: string, description: string, phone: string): void;
  abstract uploadCoverPhoto(file: File): void;
  abstract publish(): void;
}
