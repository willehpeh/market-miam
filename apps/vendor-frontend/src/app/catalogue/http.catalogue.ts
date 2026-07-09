import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Catalogue, CatalogueView } from './catalogue';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpCatalogue implements Catalogue {
  private readonly http = inject(HttpClient);

  list(): Observable<CatalogueView> {
    return this.http.get<CatalogueView>(`${environment.apiBaseUrl}/api/catalogue`);
  }
}
