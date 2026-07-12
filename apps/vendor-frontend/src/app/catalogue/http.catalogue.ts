import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Catalogue, CatalogueView, DishRevision, NewDish } from './catalogue';
import { SignedUpload } from '../storefront/signed-upload';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpCatalogue implements Catalogue {
  private readonly http = inject(HttpClient);

  list(): Observable<CatalogueView> {
    return this.http.get<CatalogueView>(`${environment.apiBaseUrl}/api/catalogue`);
  }

  photoSignature(itemId: string): Observable<SignedUpload> {
    return this.http.post<SignedUpload>(`${environment.apiBaseUrl}/api/catalogue/photo/signature`, { itemId });
  }

  add(dish: NewDish): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/catalogue`, dish);
  }

  revise({ itemId, name, description, price }: DishRevision): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/catalogue/${itemId}`, { name, description, price });
  }
}
