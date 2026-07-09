import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Catalogue } from './catalogue';
import { HttpCatalogue } from './http.catalogue';
import { catalogueFeature } from './catalogue.state';
import { CatalogueEffects } from './catalogue.effects';
import { CatalogueFacade } from './catalogue.facade';
import { StoreCatalogueFacade } from './store.catalogue.facade';

export function provideCatalogue(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Catalogue, useClass: HttpCatalogue },
    provideState(catalogueFeature),
    provideEffects(CatalogueEffects),
    { provide: CatalogueFacade, useClass: StoreCatalogueFacade },
  ]);
}
