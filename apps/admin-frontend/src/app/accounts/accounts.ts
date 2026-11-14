import { Observable } from 'rxjs';

// A sign-in the identity provider holds, with the storefront its vendor is reachable at: a
// vendor's, or an operator's, who has no vendorId.
export interface AccountListing {
  email: string | null;
  vendorId: string | null;
  subdomain: string | null;
}

// The accounts, through the operator API.
export abstract class Accounts {
  abstract list(): Observable<AccountListing[]>;
}
