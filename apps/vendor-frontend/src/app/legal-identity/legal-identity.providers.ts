import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { LegalIdentity } from './legal-identity';
import { HttpLegalIdentity } from './http.legal-identity';
import { legalIdentityFeature } from './legal-identity.state';
import { LegalIdentityEffects } from './legal-identity.effects';
import { LegalIdentityFacade } from './legal-identity.facade';
import { StoreLegalIdentityFacade } from './store.legal-identity.facade';

export function provideLegalIdentity(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LegalIdentity, useClass: HttpLegalIdentity },
    provideState(legalIdentityFeature),
    provideEffects(LegalIdentityEffects),
    { provide: LegalIdentityFacade, useClass: StoreLegalIdentityFacade },
  ]);
}
