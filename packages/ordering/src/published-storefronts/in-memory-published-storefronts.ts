import { VendorId } from '@market-miam/shared-kernel';
import { PublishedStorefronts } from './published-storefronts';

export class InMemoryPublishedStorefronts extends PublishedStorefronts {
  private readonly published = new Set<string>();
  private readonly vendorsAt = new Map<string, string>();

  publish(vendorId: string): void {
    this.published.add(vendorId);
  }

  publishAt(subdomain: string, vendorId: string): void {
    this.publish(vendorId);
    this.vendorsAt.set(subdomain, vendorId);
  }

  async include(vendorId: VendorId): Promise<boolean> {
    return this.published.has(vendorId.value());
  }

  async vendorAt(subdomain: string): Promise<VendorId | undefined> {
    const vendorId = this.vendorsAt.get(subdomain);
    return vendorId === undefined ? undefined : new VendorId(vendorId);
  }
}
