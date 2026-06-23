import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vendor } from './vendor';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpVendor implements Vendor {

  private readonly http = inject(HttpClient);

  register(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/vendors`, {});
  }
}
