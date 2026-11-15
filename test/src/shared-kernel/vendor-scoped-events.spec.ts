import { Aggregate, DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorId, VendorScopedEvents } from '@market-miam/shared-kernel';

// Every context's aggregate saves go through this door: Market Days' repositories hold a
// VendorScopedEvents and nothing else in that package may call append (the no-restricted-syntax
// append rule in its eslint config). So the vendorId stamp — which erasure and shredding key off —
// is asserted here once, not per use case.
class Tally extends Aggregate {
  apply(): void {
    // Nothing to fold: the spec watches what is raised, not what is held.
  }

  count(what: string): void {
    this.raise({ type: 'Counted', payload: { what }, version: 1 } satisfies DomainEvent);
  }
}

describe('VendorScopedEvents', () => {
  const vendorId = new VendorId('vendor-1');

  let store: InMemoryEventStore;
  let events: VendorScopedEvents;
  let tally: Tally;

  beforeEach(() => {
    store = new InMemoryEventStore();
    events = new VendorScopedEvents(store);
    tally = new Tally();
  });

  const save = () => events.save('tally-vendor-1', tally, vendorId);

  it('stamps the vendor id into the metadata of every event it appends', async () => {
    tally.count('menu');
    tally.count('close');

    await save();

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'Counted',
        payload: { what: 'menu' },
        metadata: expect.objectContaining({ vendorId: 'vendor-1' }),
      }),
      expect.objectContaining({
        type: 'Counted',
        payload: { what: 'close' },
        metadata: expect.objectContaining({ vendorId: 'vendor-1' }),
      }),
    ]);
  });

  it('appends nothing when the aggregate raised no events', async () => {
    await save();

    expect(store.newEvents()).toEqual([]);
  });
});
