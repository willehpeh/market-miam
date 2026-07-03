import { Injectable, signal } from '@angular/core';
import { StorefrontFacade } from './storefront.facade';
import { StorefrontView } from './storefront';

@Injectable()
export class FakeStorefrontFacade implements StorefrontFacade {
  readonly view = signal<StorefrontView | undefined>(undefined);
  readonly loading = signal(false);
  loaded = false;
  saved: { name: string; description: string } | undefined;

  load(): void {
    this.loaded = true;
  }

  save(name: string, description: string): void {
    this.saved = { name, description };
  }
}
