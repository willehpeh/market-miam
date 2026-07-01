import { Catalogue } from './catalogue';
import { VendorScopedEvents } from '../vendor-scoped-events';
import { VendorScopedRepository } from '../vendor-scoped-repository';

export class Catalogues extends VendorScopedRepository<Catalogue> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'catalogue', () => new Catalogue());
  }
}
