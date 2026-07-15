import { SubdomainRegistry } from './subdomain-registry';

export class InMemorySubdomainRegistry implements SubdomainRegistry {
  private readonly vendors = new Map<string, string>();

  async register(subdomain: string, vendorId: string): Promise<void> {
    this.vendors.set(subdomain.toLowerCase(), vendorId);
  }

  async vendorFor(subdomain: string): Promise<string | undefined> {
    return this.vendors.get(subdomain.toLowerCase());
  }

  async removeFor(vendorId: string): Promise<void> {
    for (const [subdomain, id] of this.vendors) {
      if (id === vendorId) this.vendors.delete(subdomain);
    }
  }
}
