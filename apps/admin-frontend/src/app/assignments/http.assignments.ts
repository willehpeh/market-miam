import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssignmentAnswer, Assignments, NameRefusal } from './assignments';

// The api's refusals of a name, in the port's terms; any other failure stays an error.
const REFUSALS: ReadonlyMap<number, NameRefusal> = new Map<number, NameRefusal>([
  [HttpStatusCode.Conflict, 'taken'],
  [HttpStatusCode.BadRequest, 'invalid'],
]);

@Injectable()
export class HttpAssignments implements Assignments {
  private readonly http = inject(HttpClient);

  assign(vendorId: string, subdomain: string): Observable<AssignmentAnswer> {
    return this.http
      .put<void>(`${environment.apiBaseUrl}/api/ops/vendors/${encodeURIComponent(vendorId)}/subdomain`, { subdomain })
      .pipe(
        map((): AssignmentAnswer => 'assigned'),
        catchError((error: unknown) => {
          const refusal = error instanceof HttpErrorResponse ? REFUSALS.get(error.status) : undefined;
          return refusal ? of<AssignmentAnswer>(refusal) : throwError(() => error);
        }),
      );
  }
}
