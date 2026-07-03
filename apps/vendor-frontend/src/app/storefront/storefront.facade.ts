import { Signal } from '@angular/core';
import { StorefrontView } from './storefront';

export abstract class StorefrontFacade {
  abstract readonly view: Signal<StorefrontView | undefined>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
  abstract save(name: string, description: string): void;
}
