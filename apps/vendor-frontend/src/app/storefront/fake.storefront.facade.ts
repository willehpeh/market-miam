import { Injectable, signal } from '@angular/core';
import { StorefrontFacade } from './storefront.facade';
import { StorefrontView } from './storefront';

@Injectable()
export class FakeStorefrontFacade implements StorefrontFacade {
  readonly view = signal<StorefrontView | undefined>(undefined);
  readonly loading = signal(false);
  readonly coverPhotoUploading = signal(false);
  readonly coverPhotoError = signal(false);
  saved: { name: string; description: string; phone: string } | undefined;
  uploadedFile: File | undefined;

  save(name: string, description: string, phone: string): void {
    this.saved = { name, description, phone };
  }

  uploadCoverPhoto(file: File): void {
    this.uploadedFile = file;
  }
}
