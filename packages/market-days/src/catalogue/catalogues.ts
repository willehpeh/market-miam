import { Catalogue } from './catalogue';
import { VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';

export class Catalogues extends VendorScopedRepository<Catalogue> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'catalogue', () => new Catalogue());
  }
}
