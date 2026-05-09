import { EventStore } from '@market-monster/event-sourcing';
import { Repertoire } from './repertoire';

export class Repertoires {
  constructor(private readonly store: EventStore) {
  }

  async forVendor(vendorId: string): Promise<Repertoire> {
    const events = await this.store.load(this.streamIdFor(vendorId));
    return new Repertoire().rehydrate(events);
  }

  async save(repertoire: Repertoire, vendorId: string): Promise<void> {
    const envelopes = repertoire.raisedEvents().map(event => ({ event }));
    await this.store.append(this.streamIdFor(vendorId), envelopes, repertoire.currentStreamPosition);
  }

  private streamIdFor(vendorId: string) {
    return `repertoire-${ vendorId }`;
  }
}
