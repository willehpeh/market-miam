import { EventStore } from '@market-monster/event-sourcing';
import { Repertoire } from './repertoire';

export class Repertoires {
  constructor(private readonly store: EventStore) {}

  async forVendor(vendorId: string): Promise<Repertoire> {
    const events = await this.store.load(`repertoire-${vendorId}`);
    const currentStreamPosition = events.length === 0 ? 0 : events[events.length - 1].streamPosition;

    return new Repertoire().rehydrate(events, currentStreamPosition);
  }

  async save(repertoire: Repertoire, vendorId: string): Promise<void> {
    const streamId = `repertoire-${vendorId}`;
    const envelopes = repertoire.raisedEvents().map(event => ({ event }));
    await this.store.append(streamId, envelopes, repertoire.currentStreamPosition);
  }
}
