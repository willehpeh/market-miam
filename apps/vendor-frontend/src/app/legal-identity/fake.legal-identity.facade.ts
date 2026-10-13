import { Injectable, signal } from '@angular/core';
import { LegalIdentityFacade } from './legal-identity.facade';
import { LegalIdentityView } from './legal-identity';
import { RegisteredCompany } from './company-registry';

@Injectable()
export class FakeLegalIdentityFacade implements LegalIdentityFacade {
  readonly identity = signal<LegalIdentityView | null | undefined>(undefined);
  readonly loading = signal(false);
  readonly company = signal<RegisteredCompany | null | undefined>(undefined);
  readonly saved = signal(false);
  readonly saveFailed = signal(false);
  loadCalled = false;
  lookedUp: string[] = [];
  savedIdentity: LegalIdentityView | undefined;

  load(): void {
    this.loadCalled = true;
  }

  lookUpCompany(siret: string): void {
    this.lookedUp.push(siret);
  }

  save(identity: LegalIdentityView): void {
    this.savedIdentity = identity;
  }
}
