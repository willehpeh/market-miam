import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { LegalIdentityFacade } from './legal-identity.facade';
import { LegalIdentityView } from './legal-identity';
import { legalIdentityFeature, LoadLegalIdentity, LookUpCompany, ProvideLegalIdentity } from './legal-identity.state';

@Injectable()
export class StoreLegalIdentityFacade implements LegalIdentityFacade {
  private readonly store = inject(Store);

  readonly identity = this.store.selectSignal(legalIdentityFeature.selectIdentity);
  readonly loading = this.store.selectSignal(legalIdentityFeature.selectLoading);
  readonly company = this.store.selectSignal(legalIdentityFeature.selectCompany);
  readonly saved = this.store.selectSignal(legalIdentityFeature.selectSaved);
  readonly saveFailed = this.store.selectSignal(legalIdentityFeature.selectSaveFailed);

  // Only an unknown identity refetches: the projection lags a save, and a re-GET could
  // 404 over the identity just provided.
  load(): void {
    if (this.identity() === undefined && !this.loading()) {
      this.store.dispatch(LoadLegalIdentity());
    }
  }

  lookUpCompany(siret: string): void {
    this.store.dispatch(LookUpCompany({ siret }));
  }

  save(identity: LegalIdentityView): void {
    this.store.dispatch(ProvideLegalIdentity({ identity }));
  }
}
