import { Vendor } from './vendor';
import { VendorScopedEvents } from '../vendor-scoped-events';
import { VendorScopedRepository } from '../vendor-scoped-repository';

export class Vendors extends VendorScopedRepository<Vendor> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'vendor', (vendorId) => new Vendor(vendorId));
  }
}
