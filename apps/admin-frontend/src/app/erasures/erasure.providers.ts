import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Erasures } from './erasures';
import { HttpErasures } from './http.erasures';
import { erasureFeature } from './erasure.state';
import { ErasureEffects } from './erasure.effects';
import { ErasureFacade } from './erasure.facade';
import { StoreErasureFacade } from './store.erasure.facade';

export function provideErasures(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Erasures, useClass: HttpErasures },
    provideState(erasureFeature),
    provideEffects(ErasureEffects),
    { provide: ErasureFacade, useClass: StoreErasureFacade },
  ]);
}
