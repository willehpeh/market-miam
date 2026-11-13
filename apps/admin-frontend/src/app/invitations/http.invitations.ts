import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { InvitationOutcome, Invitations } from './invitations';

@Injectable()
export class HttpInvitations implements Invitations {
  private readonly http = inject(HttpClient);

  send(email: string): Observable<InvitationOutcome> {
    return this.http.post<{ vendorId: string }>(`${environment.apiBaseUrl}/api/ops/vendors`, { email }).pipe(
      map((): InvitationOutcome => 'sent'),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict
          ? of<InvitationOutcome>('email-in-use')
          : throwError(() => error),
      ),
    );
  }
}
