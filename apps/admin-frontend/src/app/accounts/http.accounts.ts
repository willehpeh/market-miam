import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountListing, Accounts } from './accounts';

@Injectable()
export class HttpAccounts implements Accounts {
  private readonly http = inject(HttpClient);

  list(): Observable<AccountListing[]> {
    return this.http.get<AccountListing[]>(`${environment.apiBaseUrl}/api/ops/accounts`);
  }
}
