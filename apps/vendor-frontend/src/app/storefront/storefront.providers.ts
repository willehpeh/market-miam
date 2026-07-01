import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Storefront } from './storefront';
import { HttpStorefront } from './http.storefront';
import { storefrontFeature } from './storefront.state';
import { StorefrontEffects } from './storefront.effects';
import { StorefrontFacade } from './storefront.facade';
import { StoreStorefrontFacade } from './store.storefront.facade';

export function provideStorefront(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Storefront, useClass: HttpStorefront },
    provideState(storefrontFeature),
    provideEffects(StorefrontEffects),
    { provide: StorefrontFacade, useClass: StoreStorefrontFacade },
  ]);
}
