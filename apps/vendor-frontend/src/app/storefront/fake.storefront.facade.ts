import { computed, Injectable, signal } from '@angular/core';
import { StorefrontFacade } from './storefront.facade';
import { StorefrontView } from './storefront';
import { StorefrontAddress } from './storefront-address';
import { environment } from '../../environments/environment';

@Injectable()
export class FakeStorefrontFacade implements StorefrontFacade {
  readonly view = signal<StorefrontView | undefined>(undefined);
  readonly published = computed(() => this.view()?.published === true);
  readonly address = computed(() => StorefrontAddress.of(this.view()?.subdomain, environment.storefrontBaseDomain));
  readonly loading = signal(false);
  readonly saved = signal(false);
  readonly coverPhotoUploading = signal(false);
  readonly coverPhotoError = signal(false);
  readonly publishing = signal(false);
  readonly publishError = signal(false);
  loaded = false;
  savedInfo: { name: string; description: string; phone: string } | undefined;
  uploadedFile: File | undefined;
  publishCalled = false;
  cartePricesVisibility: boolean | undefined;

  load(): void {
    this.loaded = true;
  }

  save(name: string, description: string, phone: string): void {
    this.savedInfo = { name, description, phone };
  }

  uploadCoverPhoto(file: File): void {
    this.uploadedFile = file;
  }

  publish(): void {
    this.publishCalled = true;
  }

  setCartePricesVisible(visible: boolean): void {
    this.cartePricesVisibility = visible;
  }
}
