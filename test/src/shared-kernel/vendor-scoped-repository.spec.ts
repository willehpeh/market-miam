import { Aggregate, DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorId, VendorScopedEvents, VendorScopedRepository } from '@market-miam/shared-kernel';

// A vendor's aggregate lives in a stream named after its kind and the vendor (ADR 0009), and every
// context's repositories inherit that naming from here.
class Tally extends Aggregate {
  private counted: string[] = [];

  apply(event: DomainEvent): void {
    this.counted.push(event.payload['what'] as string);
  }

  count(what: string): void {
    this.raise({ type: 'Counted', payload: { what }, version: 1 } satisfies DomainEvent);
  }

  hasCounted(): string[] {
    return this.counted.slice();
  }
}

class Tallies extends VendorScopedRepository<Tally> {
  constructor(events: VendorScopedEvents) {
    super(events, 'tally', () => new Tally());
  }
}

describe('VendorScopedRepository', () => {
  const vendorId = new VendorId('vendor-1');

  let store: InMemoryEventStore;
  let tallies: Tallies;

  beforeEach(() => {
    store = new InMemoryEventStore();
    tallies = new Tallies(new VendorScopedEvents(store));
  });

  it('saves to the stream named after its prefix and the vendor, stamped with the vendor', async () => {
    const tally = await tallies.forVendor(vendorId);
    tally.count('menu');

    await tallies.save(tally, vendorId);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        streamId: 'tally-vendor-1',
        type: 'Counted',
        metadata: expect.objectContaining({ vendorId: 'vendor-1' }),
      }),
    ]);
  });

  it('loads the vendor’s aggregate back from that stream, and only that stream', async () => {
    store.seedWith('tally-vendor-1', [{ type: 'Counted', payload: { what: 'menu' }, version: 1 }]);
    store.seedWith('tally-vendor-2', [{ type: 'Counted', payload: { what: 'close' }, version: 1 }]);

    const tally = await tallies.forVendor(vendorId);

    expect(tally.hasCounted()).toEqual(['menu']);
    expect(tally.currentStreamPosition()).toBe(1);
  });
});
