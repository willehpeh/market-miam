import { Observable } from 'rxjs';

// A sign-in the identity provider holds, with the storefront its vendor is reachable at: a
// vendor's, or an operator's, who has no vendorId.
export interface AccountListing {
  email: string | null;
  vendorId: string | null;
  subdomain: string | null;
  // An invitation the api has accepted, whose account the processor has yet to open (ADR 0060).
  invited?: true;
  // An erasure the api has accepted, whose account the processor has yet to close (ADR 0063).
  erased?: true;
}

// The api turning the operator's sign-in away, as every operator route can.
export type Refused = 'refused';

// The accounts, through the operator API.
export abstract class Accounts {
  abstract list(): Observable<AccountListing[] | Refused>;
}
