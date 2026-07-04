import { Injectable, signal } from '@angular/core';
import { StorefrontFacade } from './storefront.facade';
import { StorefrontView } from './storefront';

@Injectable()
export class FakeStorefrontFacade implements StorefrontFacade {
  readonly view = signal<StorefrontView | undefined>(undefined);
  readonly loading = signal(false);
  saved: { name: string; description: string; phone: string } | undefined;

  save(name: string, description: string, phone: string): void {
    this.saved = { name, description, phone };
  }
}
