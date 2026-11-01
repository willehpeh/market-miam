// A Market Miam sign-in as the identity provider holds it: a vendor's, or an operator's.
export interface Account {
  readonly email: string | null;
  readonly vendorId: string | null;
}

export abstract class Accounts {
  abstract all(): Promise<Account[]>;
}
