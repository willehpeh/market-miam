import { Signal } from '@angular/core';
import { LegalIdentityView } from './legal-identity';
import { RegisteredCompany } from './company-registry';

export abstract class LegalIdentityFacade {
  // undefined until known; null once the API says none was provided.
  abstract readonly identity: Signal<LegalIdentityView | null | undefined>;
  abstract readonly loading: Signal<boolean>;
  // undefined until a lookup answers; null when the registry found nothing.
  abstract readonly company: Signal<RegisteredCompany | null | undefined>;
  abstract readonly saved: Signal<boolean>;
  abstract readonly saveFailed: Signal<boolean>;

  abstract load(): void;
  abstract lookUpCompany(siret: string): void;
  abstract save(identity: LegalIdentityView): void;
}
