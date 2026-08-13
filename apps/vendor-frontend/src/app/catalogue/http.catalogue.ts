import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Catalogue, CatalogueView, ItemRevision, NewItem } from './catalogue';
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

  add(item: NewItem): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/catalogue`, item);
  }

  revise({ itemId, name, description, price, variants }: ItemRevision): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/catalogue/${itemId}`, { name, description, price, variants });
  }

  reorder(itemIds: string[]): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/catalogue/order`, { itemIds });
  }

  retire(itemId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/catalogue/${itemId}`);
  }

  changePhoto(itemId: string, imageReference: string): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/catalogue/${itemId}/photo`, { imageReference });
  }
}
