import { Observable } from 'rxjs';

// Assigning a vendor's subdomain through the operator API (ADR 0065).
export abstract class Assignments {
  abstract assign(vendorId: string, subdomain: string): Observable<void>;
}
