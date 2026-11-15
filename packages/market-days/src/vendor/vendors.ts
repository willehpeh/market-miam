import { Vendor } from './vendor';
import { VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';

export class Vendors extends VendorScopedRepository<Vendor> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'vendor', (vendorId) => new Vendor(vendorId));
  }
}
