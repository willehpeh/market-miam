import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Assignments } from './assignments';

@Injectable()
export class HttpAssignments implements Assignments {
  private readonly http = inject(HttpClient);

  assign(vendorId: string, subdomain: string): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/ops/vendors/${encodeURIComponent(vendorId)}/subdomain`, {
      subdomain,
    });
  }
}
