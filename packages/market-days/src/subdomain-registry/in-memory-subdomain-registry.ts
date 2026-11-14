import { SubdomainAssignment, SubdomainClaim, SubdomainRegistry } from './subdomain-registry';

export class InMemorySubdomainRegistry implements SubdomainRegistry {
  private readonly vendors = new Map<string, string>();

  async register(subdomain: string, vendorId: string): Promise<SubdomainClaim> {
    const name = subdomain.toLowerCase();
    const assignedTo = this.vendors.get(name);
    if (assignedTo === vendorId) {
      return 'already-theirs';
    }
    if (assignedTo !== undefined) {
      return 'taken';
    }
    const held = await this.subdomainFor(vendorId);
    if (held !== undefined && held !== name) {
      return 'has-another';
    }
    this.vendors.set(name, vendorId);
    return 'claimed';
  }

  async vendorFor(subdomain: string): Promise<string | undefined> {
    return this.vendors.get(subdomain.toLowerCase());
  }

  async subdomainFor(vendorId: string): Promise<string | undefined> {
    for (const [subdomain, id] of this.vendors) {
      if (id === vendorId) return subdomain;
    }
    return undefined;
  }

  async removeFor(vendorId: string): Promise<void> {
    for (const [subdomain, id] of this.vendors) {
      if (id === vendorId) this.vendors.delete(subdomain);
    }
  }

  async assignments(): Promise<SubdomainAssignment[]> {
    return [...this.vendors]
      .map(([subdomain, vendorId]) => ({ subdomain, vendorId }))
      .sort((a, b) => (a.subdomain < b.subdomain ? -1 : 1));
  }
}
