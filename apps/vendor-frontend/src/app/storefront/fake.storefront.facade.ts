import { Injectable, signal } from '@angular/core';
import { StorefrontFacade } from './storefront.facade';
import { StorefrontView } from './storefront-view';

@Injectable()
export class FakeStorefrontFacade implements StorefrontFacade {
  readonly view = signal<StorefrontView | undefined>(undefined);
  readonly loading = signal(false);
  loaded = false;

  load(): void {
    this.loaded = true;
  }
}
