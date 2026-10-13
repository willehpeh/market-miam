import { Observable } from 'rxjs';

// What the vendor typed (ADR 0054): SIREN and TVA number are derived by the API, never sent.
export interface LegalIdentityView {
  siret: string;
  legalName: string;
  address: string;
  contactEmail: string;
  phone: string;
  vatRegime: string;
  mediatorName: string | null;
  mediatorUrl: string | null;
  legalForm: string | null;
  shareCapital: string | null;
  registryCity: string | null;
  legalRepresentative: string | null;
}

export abstract class LegalIdentity {
  abstract view(): Observable<LegalIdentityView>;
  abstract provide(identity: LegalIdentityView): Observable<void>;
}
