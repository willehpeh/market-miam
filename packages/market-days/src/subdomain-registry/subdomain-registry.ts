export abstract class SubdomainRegistry {
  abstract vendorFor(subdomain: string): Promise<string | undefined>;
  abstract subdomainFor(vendorId: string): Promise<string | undefined>;
  abstract removeFor(vendorId: string): Promise<void>;
}
