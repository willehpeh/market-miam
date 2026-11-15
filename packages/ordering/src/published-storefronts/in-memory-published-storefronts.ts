import { PublishedStorefronts } from './published-storefronts';

export class InMemoryPublishedStorefronts extends PublishedStorefronts {
  private readonly published = new Set<string>();

  publish(vendorId: string): void {
    this.published.add(vendorId);
  }
}
