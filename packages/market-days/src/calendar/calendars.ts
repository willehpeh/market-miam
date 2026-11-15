import { Calendar } from './index';
import { VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';

export class Calendars extends VendorScopedRepository<Calendar> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'calendar', () => new Calendar());
  }
}
