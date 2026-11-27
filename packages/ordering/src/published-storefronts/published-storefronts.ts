import { VendorId } from '@market-miam/shared-kernel';

export abstract class PublishedStorefronts {
  abstract include(vendorId: VendorId): Promise<boolean>;
  abstract vendorAt(subdomain: string): Promise<VendorId | undefined>;
}
