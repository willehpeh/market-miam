import { Calendar } from './index';
import { EventStore } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';

export class Calendars {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: VendorId): Promise<Calendar> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Calendar().rehydrate(events);
  }

  async save(calendar: Calendar, vendorId: VendorId) {
    const envelopes = calendar.raisedEvents().map(event => ({ event }));
    await this.store.append(this.streamIdFor(vendorId), envelopes, calendar.currentStreamPosition);
  }

  private streamIdFor(vendorId: VendorId) {
    return `calendar-${ vendorId.value() }`;
  }
}
