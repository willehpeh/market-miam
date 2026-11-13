import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invitations } from './invitations';

@Injectable()
export class HttpInvitations implements Invitations {
  private readonly http = inject(HttpClient);

  send(email: string): Observable<void> {
    return this.http
      .post<{ vendorId: string }>(`${environment.apiBaseUrl}/api/ops/vendors`, { email })
      .pipe(map(() => undefined));
  }
}
