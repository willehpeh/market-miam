import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  EraseVendor,
  EraseVendorHandler,
  ProvideVendorLegalIdentityHandler,
  RegisterVendorHandler,
  VendorErasedError,
  VendorNotRegisteredError,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { TestRegisterVendor } from '../register-vendor/test-data';
import { TestProvideVendorLegalIdentity } from '../provide-vendor-legal-identity/test-data';

describe('Erase Vendor', () => {
  let store: InMemoryEventStore;
  let vendors: Vendors;
  let handler: EraseVendorHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(new VendorScopedEvents(store));
    handler = new EraseVendorHandler(vendors);
  });

  it('erases a registered vendor', async () => {
    registerVendor();

    await handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'VendorErased',
        payload: { vendorId: 'vendor-id', erasedAt: '2026-10-04T09:00:00.000Z' },
      }),
    ]);
  });

  it('raises nothing when the vendor is already erased, so an erasure can be run again', async () => {
    registerVendor();
    await handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));

    await handler.execute(new EraseVendor('vendor-id', '2026-10-05T09:00:00.000Z'));

    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'VendorErased' })]);
  });

  it('rejects erasing a vendor who has not registered', async () => {
    await expect(handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'))).rejects.toThrow(
      VendorNotRegisteredError,
    );
    expect(store.newEvents()).toEqual([]);
  });

  it('refuses a legal identity from an erased vendor', async () => {
    registerVendor();
    await handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));

    await expect(
      new ProvideVendorLegalIdentityHandler(vendors).execute(TestProvideVendorLegalIdentity.valid()),
    ).rejects.toThrow(VendorErasedError);
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'VendorErased' })]);
  });

  it('refuses to register an erased vendor again', async () => {
    registerVendor();
    await handler.execute(new EraseVendor('vendor-id', '2026-10-04T09:00:00.000Z'));

    await expect(new RegisterVendorHandler(vendors).execute(TestRegisterVendor.valid())).rejects.toThrow(
      VendorErasedError,
    );
    expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'VendorErased' })]);
  });

  function registerVendor() {
    store.seedWith('vendor-vendor-id', [{
      type: 'VendorRegistered',
      payload: { vendorId: 'vendor-id', registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' },
      version: 1,
    }], { vendorId: 'vendor-id' });
  }
});
