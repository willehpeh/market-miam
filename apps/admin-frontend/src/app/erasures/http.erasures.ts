import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Erasures } from './erasures';

@Injectable()
export class HttpErasures implements Erasures {
  private readonly http = inject(HttpClient);

  erase(vendorId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/ops/vendors/${encodeURIComponent(vendorId)}/erasure`, null);
  }
}
