import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { RegisterVendor, RegisterVendorHandler, VendorErasedError, VendorRegistered, Vendors } from '@market-miam/market-days';
import { vendorErased, vendorRegistered, vendorStream } from '../vendor-events';
import { TestRegisterVendor } from './test-data';

describe('Register Vendor', () => {
  let handler: RegisterVendorHandler;
  let vendors: Vendors;
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(new VendorScopedEvents(store));
    handler = new RegisterVendorHandler(vendors);
  });

  it('should register a new Vendor', async () => {
    const command = TestRegisterVendor.valid();
    await handler.execute(command);

    expectSingleEventFrom(command);
  });

  it.each([
    { scenario: 'an identical re-registration', second: TestRegisterVendor.valid() },
    {
      scenario: 'a re-registration with different details',
      second: TestRegisterVendor.with({ registeredAt: '2026-06-14T09:00:00.000Z', email: 'different@anything.com' }),
    },
  ])('is idempotent on $scenario, retaining the original registration', async ({ second }) => {
    const first = TestRegisterVendor.valid();
    await handler.execute(first);
    await handler.execute(second);

    expectSingleEventFrom(first);
  });

  it('registers different vendors independently', async () => {
    const first = TestRegisterVendor.valid();
    const second = TestRegisterVendor.with({ vendorId: 'another-vendor' });
    await handler.execute(first);
    await handler.execute(second);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'VendorRegistered', payload: expect.objectContaining({ vendorId: first.vendorId }) }),
      expect.objectContaining({ type: 'VendorRegistered', payload: expect.objectContaining({ vendorId: second.vendorId }) }),
    ]);
  });

  // Erasure is final: the vendor id is not freed for a fresh registration (ADR 0058).
  it('refuses to register an erased vendor again', async () => {
    store.seedWith(vendorStream(), [
      vendorRegistered('vendor-id', { registeredAt: '2026-09-01T08:00:00.000Z', email: 'marie@example.fr' }),
      vendorErased('vendor-id', '2026-10-04T09:00:00.000Z'),
    ], { vendorId: 'vendor-id' });

    await expect(handler.execute(TestRegisterVendor.valid())).rejects.toThrow(VendorErasedError);
    expect(store.newEvents()).toEqual([]);
  });

  function expectSingleEventFrom(command: RegisterVendor) {
    const expectedEvent: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: command.vendorId,
        registeredAt: command.registeredAt,
        email: command.email
      },
      version: 1
    };

    expect(store.newEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  }
});
