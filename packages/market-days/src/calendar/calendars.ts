import { Calendar } from './index';
import { EventStore } from '@market-monster/event-sourcing';

export class Calendars {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: string): Promise<Calendar> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Calendar().rehydrate(events);
  }

  async save(calendar: Calendar, vendorId: string) {
    const envelopes = calendar.raisedEvents().map(event => ({ event }));
    await this.store.append(this.streamIdFor(vendorId), envelopes, calendar.currentStreamPosition);
  }

  private streamIdFor(vendorId: string) {
    return `calendar-${ vendorId }`;
  }
}
