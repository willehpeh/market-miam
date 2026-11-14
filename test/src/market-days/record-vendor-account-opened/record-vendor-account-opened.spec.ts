import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  RecordVendorAccountOpened,
  RecordVendorAccountOpenedHandler,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorInvited, vendorStream } from '../vendor-events';

describe('Record Vendor Account Opened', () => {
  let store: InMemoryEventStore;
  let handler: RecordVendorAccountOpenedHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new RecordVendorAccountOpenedHandler(new Vendors(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(vendorStream('vendor-id'), history, { vendorId: 'vendor-id' });

  it("records an invited vendor's account opened", async () => {
    given(vendorInvited());

    await handler.execute(new RecordVendorAccountOpened('vendor-id', '2026-11-11T09:00:05.000Z'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorAccountOpened',
        payload: { vendorId: 'vendor-id', openedAt: '2026-11-11T09:00:05.000Z' },
      }),
    ]);
  });
});
