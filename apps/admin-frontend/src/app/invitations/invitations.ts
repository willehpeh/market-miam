import { Observable } from 'rxjs';

// Inviting a vendor through the operator API (ADR 0060).
export abstract class Invitations {
  abstract send(email: string): Observable<void>;
}
