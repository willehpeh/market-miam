import { Storefront } from './storefront';
import { VendorScopedEvents } from '../vendor-scoped-events';
import { VendorScopedRepository } from '../vendor-scoped-repository';

export class Storefronts extends VendorScopedRepository<Storefront> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'storefront', () => new Storefront());
  }
}
