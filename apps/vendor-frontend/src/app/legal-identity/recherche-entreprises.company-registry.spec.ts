import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompanyRegistry, RegisteredCompany } from './company-registry';
import { RechercheEntreprisesCompanyRegistry } from './recherche-entreprises.company-registry';

const SEARCH = 'https://recherche-entreprises.api.gouv.fr/search';

// The parts of a /search result the adapter reads, shaped as the API returns them.
function result(overrides: { nom_raison_sociale?: string | null; individual?: boolean; sirets?: string[] } = {}) {
  return {
    nom_complet: 'MARGAUX DUPONT',
    nom_raison_sociale: overrides.nom_raison_sociale ?? null,
    complements: { est_entrepreneur_individuel: overrides.individual ?? true },
    matching_etablissements: (overrides.sirets ?? ['73282932000074']).map((siret) => ({
      siret,
      adresse: `ADRESSE DE ${siret}`,
    })),
  };
}

describe('RechercheEntreprisesCompanyRegistry', () => {
  let registry: CompanyRegistry;
  let httpCtrl: HttpTestingController;
  let found: RegisteredCompany | null | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyRegistry, useClass: RechercheEntreprisesCompanyRegistry },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    registry = TestBed.inject(CompanyRegistry);
    httpCtrl = TestBed.inject(HttpTestingController);
    found = undefined;
  });

  afterEach(() => httpCtrl.verify());

  function search(siret: string) {
    registry.find(siret).subscribe((company) => (found = company));
    return httpCtrl.expectOne((req) => req.url === SEARCH && req.params.get('q') === siret);
  }

  it("finds an entrepreneur individuel's name and the address of the establishment", () => {
    search('73282932000074').flush({ results: [result()] });

    expect(found).toEqual({ legalName: 'MARGAUX DUPONT', address: 'ADRESSE DE 73282932000074', individual: true });
  });

  it("names a société by its raison sociale", () => {
    search('73282932000074').flush({ results: [result({ nom_raison_sociale: 'MARGAUX SARL', individual: false })] });

    expect(found).toEqual({ legalName: 'MARGAUX SARL', address: 'ADRESSE DE 73282932000074', individual: false });
  });

  it('takes the address of the establishment the SIRET names, not the first', () => {
    search('73282932000074').flush({ results: [result({ sirets: ['73282932000066', '73282932000074'] })] });

    expect(found?.address).toBe('ADRESSE DE 73282932000074');
  });

  // The search is full-text: a near-miss can come back for a SIRET that names nobody.
  it('finds nothing when no establishment carries the SIRET', () => {
    search('73282932000074').flush({ results: [result({ sirets: ['44306184100047'] })] });

    expect(found).toBeNull();
  });

  it('finds nothing for a SIRET under Sirene non-diffusion', () => {
    search('73282932000074').flush({ results: [] });

    expect(found).toBeNull();
  });

  it('finds nothing when the registry is down', () => {
    search('73282932000074').flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(found).toBeNull();
  });
});
