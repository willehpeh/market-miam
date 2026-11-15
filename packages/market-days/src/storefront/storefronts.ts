import { Storefront } from './storefront';
import { VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';

export class Storefronts extends VendorScopedRepository<Storefront> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'storefront', () => new Storefront());
  }
}
