export interface SubdomainAssignment {
  readonly subdomain: string;
  readonly vendorId: string;
}

export abstract class SubdomainRegistry {
  abstract vendorFor(subdomain: string): Promise<string | undefined>;
  abstract subdomainFor(vendorId: string): Promise<string | undefined>;
  abstract removeFor(vendorId: string): Promise<void>;
  // Every subdomain and the vendor it belongs to, ordered by subdomain: what operators see.
  abstract assignments(): Promise<SubdomainAssignment[]>;
}
