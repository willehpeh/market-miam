import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  EraseVendor,
  EraseVendorHandler,
  VendorNotRegisteredError,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { vendorErased, vendorInvited, vendorRegistered, vendorStream } from '../vendor-events';

describe('Erase Vendor', () => {
  let store: InMemoryEventStore;
  let vendors: Vendors;
  let handler: EraseVendorHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(new VendorScopedEvents(store));
    handler = new EraseVendorHandler(vendors);
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(vendorStream('vendor-id'), history, { vendorId: 'vendor-id' });

  const registered = (): DomainEvent =>
    vendorRegistered('vendor-id', { registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' });

  it('erases a registered vendor', async () => {
    given(registered());

    await handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorErased',
        payload: { vendorId: 'vendor-id', erasedAt: '2026-10-04T09:00:00.000Z' },
      }),
    ]);
  });

  // An invitation that never became an account is erased like any vendor (ADR 0060).
  it('erases a vendor who was invited and never registered', async () => {
    given(vendorInvited());

    await handler.execute(new EraseVendor('vendor-id', '2026-11-12T09:00:00.000Z'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorErased',
        payload: { vendorId: 'vendor-id', erasedAt: '2026-11-12T09:00:00.000Z' },
      }),
    ]);
  });

  it('raises nothing when the vendor is already erased, so an erasure can be run again', async () => {
    given(registered(), vendorErased('vendor-id', '2026-10-04T09:00:00.000Z'));

    await handler.execute(new EraseVendor('vendor-id', '2026-10-05T09:00:00.000Z'));

    expect(store.newEvents()).toEqual([]);
  });

  it('rejects erasing a vendor who has not registered', async () => {
    await expect(handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'))).rejects.toThrow(
      VendorNotRegisteredError,
    );
    expect(store.newEvents()).toEqual([]);
  });

});
