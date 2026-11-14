import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  RecordVendorAccountClosed,
  RecordVendorAccountClosedHandler,
  VendorNotErasedError,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorAccountClosed, vendorErased, vendorInvited, vendorRegistered, vendorStream } from '../vendor-events';

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

  // The processor sends it again when it retries after a crash between the record and its checkpoint.
  it('raises nothing when the account is already recorded closed', async () => {
    given(vendorRegistered(), vendorErased(), vendorAccountClosed());

    await handler.execute(new RecordVendorAccountClosed('vendor-id', '2026-11-14T09:10:00.000Z'));

    expect(store.newEvents()).toEqual([]);
  });

  // Only erasure closes an account (ADR 0063).
  it('refuses a registered vendor', async () => {
    given(vendorRegistered());

    await expect(handler.execute(new RecordVendorAccountClosed('vendor-id', '2026-11-14T09:00:05.000Z'))).rejects.toThrow(
      VendorNotErasedError,
    );
    expect(store.newEvents()).toEqual([]);
  });

  it('refuses an invited vendor', async () => {
    given(vendorInvited());

    await expect(handler.execute(new RecordVendorAccountClosed('vendor-id', '2026-11-14T09:00:05.000Z'))).rejects.toThrow(
      VendorNotErasedError,
    );
    expect(store.newEvents()).toEqual([]);
  });
});
