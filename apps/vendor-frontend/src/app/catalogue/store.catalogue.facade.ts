import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { CatalogueFacade } from './catalogue.facade';
import { catalogueFeature, LoadCatalogue } from './catalogue.state';

@Injectable()
export class StoreCatalogueFacade implements CatalogueFacade {
  private readonly store = inject(Store);

  readonly items = this.store.selectSignal(catalogueFeature.selectItems);
  readonly loading = this.store.selectSignal(catalogueFeature.selectLoading);

  load(): void {
    this.store.dispatch(LoadCatalogue());
  }
}
