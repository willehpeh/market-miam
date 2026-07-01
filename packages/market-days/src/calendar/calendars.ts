import { Calendar } from './index';
import { VendorScopedEvents } from '../vendor-scoped-events';
import { VendorScopedRepository } from '../vendor-scoped-repository';

export class Calendars extends VendorScopedRepository<Calendar> {
  constructor(vendorEvents: VendorScopedEvents) {
    super(vendorEvents, 'calendar', () => new Calendar());
  }
}
