import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LegalIdentity, LegalIdentityView } from './legal-identity';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpLegalIdentity implements LegalIdentity {
  private readonly http = inject(HttpClient);

  view(): Observable<LegalIdentityView> {
    return this.http.get<LegalIdentityView>(`${environment.apiBaseUrl}/api/legal-identity`);
  }

  provide(identity: LegalIdentityView): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/legal-identity`, identity);
  }
}
