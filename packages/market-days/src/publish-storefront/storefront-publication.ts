import { Storefront } from '../storefront/storefront';
import { StorefrontNotReadyToPublish } from '../storefront/storefront-not-ready-to-publish.error';

export class StorefrontPublication {
  publish(storefront: Storefront): void {
    const missing: string[] = [];
    if (!storefront.hasTitle()) missing.push('title');
    if (missing.length > 0) {
      throw new StorefrontNotReadyToPublish(missing);
    }
  }
}
