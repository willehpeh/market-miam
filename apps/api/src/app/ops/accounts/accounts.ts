import { SignInAddress } from '@market-miam/common';

// A Market Miam sign-in as the identity provider holds it: a vendor's, or an operator's.
export interface Account {
  readonly email: string | null;
  readonly vendorId: string | null;
}

export abstract class Accounts {
  abstract all(): Promise<Account[]>;
  // Whether any account, a vendor's or an operator's, signs in at this address.
  abstract contains(address: SignInAddress): Promise<boolean>;
}
