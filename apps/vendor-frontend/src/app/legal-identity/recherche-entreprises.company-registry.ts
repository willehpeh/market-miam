import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { CompanyRegistry, RegisteredCompany } from './company-registry';

interface SearchResponse {
  results: {
    nom_complet: string;
    nom_raison_sociale: string | null;
    complements: { est_entrepreneur_individuel: boolean };
    matching_etablissements: { siret: string; adresse: string }[];
  }[];
}

// Open data, no key, CORS open (ADR 0054): called from the browser, not through our API.
@Injectable()
export class RechercheEntreprisesCompanyRegistry implements CompanyRegistry {
  private readonly http = inject(HttpClient);

  find(siret: string): Observable<RegisteredCompany | null> {
    return this.http
      .get<SearchResponse>('https://recherche-entreprises.api.gouv.fr/search', { params: { q: siret } })
      .pipe(
        map(({ results }) => {
          for (const company of results) {
            const establishment = company.matching_etablissements.find((candidate) => candidate.siret === siret);
            if (establishment) {
              return {
                legalName: company.nom_raison_sociale ?? company.nom_complet,
                address: establishment.adresse,
                individual: company.complements.est_entrepreneur_individuel,
              };
            }
          }
          return null;
        }),
        catchError(() => of(null)),
      );
  }
}
