import { Calendar } from './index';
import { VendorId } from '@market-monster/shared-kernel';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class Calendars {
  constructor(private readonly vendorEvents: VendorScopedEvents) {
  }

  async forVendor(vendorId: VendorId): Promise<Calendar> {
    const events = await this.vendorEvents.load(this.streamIdFor(vendorId));
    return new Calendar().rehydrate(events);
  }

  async save(calendar: Calendar, vendorId: VendorId) {
    await this.vendorEvents.save(this.streamIdFor(vendorId), calendar, vendorId);
  }

  private streamIdFor(vendorId: VendorId) {
    return `calendar-${ vendorId.value() }`;
  }
}
