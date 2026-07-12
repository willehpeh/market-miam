import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Catalogue } from './catalogue';
import { HttpCatalogue } from './http.catalogue';
import { catalogueFeature } from './catalogue.state';
import { CatalogueEffects } from './catalogue.effects';
import { CatalogueFacade } from './catalogue.facade';
import { StoreCatalogueFacade } from './store.catalogue.facade';
// ponytail: dish photos reuse the storefront's photo-upload port/adapter as-is. Extract these
// to core/ if a third feature needs signed uploads; two consumers doesn't earn the move yet.
import { PhotoUploads } from '../storefront/photo-uploads';
import { CloudinaryPhotoUploads } from '../storefront/cloudinary.photo-uploads';

export function provideCatalogue(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Catalogue, useClass: HttpCatalogue },
    { provide: PhotoUploads, useClass: CloudinaryPhotoUploads },
    provideState(catalogueFeature),
    provideEffects(CatalogueEffects),
    { provide: CatalogueFacade, useClass: StoreCatalogueFacade },
  ]);
}
