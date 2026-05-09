import { EventStore } from '@market-monster/event-sourcing';
import { Repertoire } from './repertoire';

export class Repertoires {
  constructor(private readonly store: EventStore) {}

  async forVendor(vendorId: string) {
    const events = await this.store.load(`repertoire-${vendorId}`);
    const repertoire = new Repertoire().rehydrate(events);
  }
}
