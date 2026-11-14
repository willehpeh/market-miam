import { Observable } from 'rxjs';

// Erasing a vendor through the operator API (ADR 0058, 0063).
export abstract class Erasures {
  abstract erase(vendorId: string): Observable<void>;
}
