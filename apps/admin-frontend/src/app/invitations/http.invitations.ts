import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { InvitationOutcome, InvitationRefusal, Invitations } from './invitations';

// The api's refusals of an address, in the port's terms; any other failure stays an error.
const REFUSALS: ReadonlyMap<number, InvitationRefusal> = new Map<number, InvitationRefusal>([
  [HttpStatusCode.Conflict, 'email-in-use'],
  [HttpStatusCode.BadRequest, 'invalid-email'],
]);

@Injectable()
export class HttpInvitations implements Invitations {
  private readonly http = inject(HttpClient);

  send(email: string): Observable<InvitationOutcome> {
    return this.http.post<{ vendorId: string }>(`${environment.apiBaseUrl}/api/ops/vendors`, { email }).pipe(
      map((): InvitationOutcome => 'sent'),
      catchError((error: unknown) => {
        const refusal = error instanceof HttpErrorResponse ? REFUSALS.get(error.status) : undefined;
        return refusal ? of(refusal) : throwError(() => error);
      }),
    );
  }
}
