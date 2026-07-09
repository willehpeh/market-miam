import { Injectable, signal } from '@angular/core';
import { CatalogueFacade } from './catalogue.facade';
import { CatalogueItemView } from './catalogue';

@Injectable()
export class FakeCatalogueFacade implements CatalogueFacade {
  readonly items = signal<CatalogueItemView[]>([]);
  readonly loading = signal(false);
  loaded = false;

  load(): void {
    this.loaded = true;
  }
}
