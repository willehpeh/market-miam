import { Signal } from '@angular/core';
import { StorefrontView } from './storefront-view';

export abstract class StorefrontFacade {
  abstract readonly view: Signal<StorefrontView | undefined>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
}
