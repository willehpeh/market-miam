export interface SubdomainAssignment {
  readonly subdomain: string;
  readonly vendorId: string;
}

// What claiming a name for a vendor came to: theirs now, theirs before, another vendor's
// already, or refused because the vendor has another.
export type SubdomainClaim = 'claimed' | 'already-theirs' | 'taken' | 'has-another';

export abstract class SubdomainRegistry {
  abstract register(subdomain: string, vendorId: string): Promise<SubdomainClaim>;
  abstract vendorFor(subdomain: string): Promise<string | undefined>;
  abstract subdomainFor(vendorId: string): Promise<string | undefined>;
  abstract removeFor(vendorId: string): Promise<void>;
  // Every subdomain and the vendor it belongs to, ordered by subdomain: what operators see.
  abstract assignments(): Promise<SubdomainAssignment[]>;
}
