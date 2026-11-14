import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountListing, Accounts, Refused } from './accounts';

// The operator guard's answers: no valid token, or a token without the operate permission.
const REFUSALS: ReadonlySet<number> = new Set([HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden]);

@Injectable()
export class HttpAccounts implements Accounts {
  private readonly http = inject(HttpClient);

  list(): Observable<AccountListing[] | Refused> {
    return this.http.get<AccountListing[]>(`${environment.apiBaseUrl}/api/ops/accounts`).pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && REFUSALS.has(error.status) ? of<Refused>('refused') : throwError(() => error),
      ),
    );
  }
}
