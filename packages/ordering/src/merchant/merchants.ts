import { VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';
import { Merchant } from './merchant';

export class Merchants extends VendorScopedRepository<Merchant> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'ordering-merchant', (vendorId) => new Merchant(vendorId));
  }
}
