import { Observable } from 'rxjs';

export interface RegisteredCompany {
  legalName: string;
  address: string;
  individual: boolean;
}

// null when the registry has nothing for the SIRET: a typo, Sirene non-diffusion, or the
// registry being down. Each leaves the vendor typing the fields themselves.
export abstract class CompanyRegistry {
  abstract find(siret: string): Observable<RegisteredCompany | null>;
}
