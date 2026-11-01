import type { SubdomainAssignment } from '@market-miam/market-days';
import type { Account } from './accounts/accounts';

export interface AccountListing {
  readonly email: string | null;
  readonly vendorId: string | null;
  readonly subdomain: string | null;
}

// Each account with the subdomain its vendor holds, if any, ordered by email with
// email-less accounts last.
export function accountList(accounts: Account[], assignments: SubdomainAssignment[]): AccountListing[] {
  const subdomainOf = new Map(assignments.map(({ vendorId, subdomain }) => [vendorId, subdomain]));
  return accounts
    .map(({ email, vendorId }) => ({
      email,
      vendorId,
      subdomain: (vendorId && subdomainOf.get(vendorId)) || null,
    }))
    .sort((a, b) => {
      if (a.email === b.email) return 0;
      if (a.email === null) return 1;
      if (b.email === null) return -1;
      return a.email < b.email ? -1 : 1;
    });
}
