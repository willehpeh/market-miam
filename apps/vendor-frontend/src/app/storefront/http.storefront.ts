import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Storefront, StorefrontView } from './storefront';
import { SignedUpload } from './signed-upload';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpStorefront implements Storefront {
  private readonly http = inject(HttpClient);

  view(): Observable<StorefrontView> {
    return this.http.get<StorefrontView>(`${environment.apiBaseUrl}/api/storefront`);
  }

  edit(name: string, description: string, phone: string): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/storefront`, { name, description, phone });
  }

  coverPhotoSignature(): Observable<SignedUpload> {
    return this.http.post<SignedUpload>(`${environment.apiBaseUrl}/api/storefront/cover-photo/signature`, {});
  }

  setCoverPhoto(version: number): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/storefront/cover-photo`, { version });
  }

  publish(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/storefront/publish`, {});
  }
}
