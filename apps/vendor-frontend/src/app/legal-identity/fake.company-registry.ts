import { Observable, of } from 'rxjs';
import { CompanyRegistry, RegisteredCompany } from './company-registry';

export class FakeCompanyRegistry implements CompanyRegistry {
  private readonly companies = new Map<string, RegisteredCompany>();

  register(siret: string, company: RegisteredCompany): void {
    this.companies.set(siret, company);
  }

  find(siret: string): Observable<RegisteredCompany | null> {
    return of(this.companies.get(siret) ?? null);
  }
}
