import { Observable } from 'rxjs';

// The api refusing the name: another vendor has it, or this one has another (409); or it is no
// subdomain a storefront can have, malformed or reserved (400).
export type NameRefusal = 'taken' | 'invalid';

// What the api answers to an assignment: done, or the name refused.
export type AssignmentAnswer = 'assigned' | NameRefusal;

// Why an assignment didn't go: the api refused the name, or it couldn't be sent at all.
export type AssignmentRefusal = NameRefusal | 'not-assigned';

// A vendor's assignment that didn't go, and why.
export interface RefusedAssignment {
  vendorId: string;
  refusal: AssignmentRefusal;
}

// Assigning a vendor's subdomain through the operator API (ADR 0065).
export abstract class Assignments {
  abstract assign(vendorId: string, subdomain: string): Observable<AssignmentAnswer>;
}
