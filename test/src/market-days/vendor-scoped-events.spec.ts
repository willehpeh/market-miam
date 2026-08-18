import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { ItemId, MarketDay, MarketDayId, Menu, VendorScopedEvents } from '@market-miam/market-days';
import { LocalDate, LocalTime } from '@market-miam/common';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { TODAY } from './set-market-day-menu/test-data';

// The one door every aggregate save goes through: the five repositories hold a
// VendorScopedEvents and nothing else in the package may call append (the
// event-sourcing/no-direct-append lint rule). So the vendorId stamp — which
// erasure and shredding key off — is asserted here once, not per use case.
describe('VendorScopedEvents', () => {
  const vendorId = new VendorId('vendor-1');
  const id = new MarketDayId(new MarketId('market-1'), new LocalDate(TODAY));

  let store: InMemoryEventStore;
  let events: VendorScopedEvents;
  let marketDay: MarketDay;

  beforeEach(() => {
    store = new InMemoryEventStore();
    events = new VendorScopedEvents(store);
    marketDay = new MarketDay(id, new LocalDate(TODAY));
  });

  const save = () => events.save(id.streamIdFor(vendorId), marketDay, vendorId);

  it('stamps the vendor id into the metadata of every event it appends', async () => {
    marketDay.setMenu(new Menu([new ItemId('item-1')]));
    marketDay.close(new LocalTime('11:00'));

    await save();

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        metadata: expect.objectContaining({ vendorId: 'vendor-1' }),
      }),
      expect.objectContaining({
        type: 'MarketDayClosed',
        metadata: expect.objectContaining({ vendorId: 'vendor-1' }),
      }),
    ]);
  });

  it('appends nothing when the aggregate raised no events', async () => {
    await save();

    expect(store.newEvents()).toEqual([]);
  });
});
