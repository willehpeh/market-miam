import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  RecordVendorAccountClosed,
  RecordVendorAccountClosedHandler,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorErased, vendorRegistered, vendorStream } from '../vendor-events';

describe('Record Vendor Account Closed', () => {
  let store: InMemoryEventStore;
  let handler: RecordVendorAccountClosedHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new RecordVendorAccountClosedHandler(new Vendors(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(vendorStream('vendor-id'), history, { vendorId: 'vendor-id' });

  // The one command an erased vendor accepts: its event carries no personal data (ADR 0063).
  it("records an erased vendor's account closed", async () => {
    given(vendorRegistered(), vendorErased());

    await handler.execute(new RecordVendorAccountClosed('vendor-id', '2026-11-14T09:00:05.000Z'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorAccountClosed',
        payload: { vendorId: 'vendor-id', closedAt: '2026-11-14T09:00:05.000Z' },
      }),
    ]);
  });
});
