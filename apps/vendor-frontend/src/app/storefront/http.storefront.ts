import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Storefront, StorefrontView } from './storefront';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpStorefront implements Storefront {
  private readonly http = inject(HttpClient);

  view(): Observable<StorefrontView> {
    return this.http.get<StorefrontView>(`${environment.apiBaseUrl}/api/storefront`);
  }
}
