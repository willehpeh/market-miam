import { Signal } from '@angular/core';
import { CatalogueItemView } from './catalogue';

export abstract class CatalogueFacade {
  abstract readonly items: Signal<CatalogueItemView[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
}
