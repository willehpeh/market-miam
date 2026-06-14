import { InMemoryEventStore } from '../../in-memory.event-store';
import { RegisterVendorHandler, Vendors, VendorRegistered } from '@market-monster/market-days';
import { TestRegisterVendor } from './test-data';

describe('Register Vendor', () => {
  let handler: RegisterVendorHandler;
  let vendors: Vendors;
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(store);
    handler = new RegisterVendorHandler(vendors);
  });

  it('should register a new Vendor', async () => {
    const command = TestRegisterVendor.valid();
    await handler.execute(command);

    const expectedEvent: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: command.vendorId,
        registeredAt: command.registeredAt,
        email: command.email
      }
    };

    expect(store.newEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  });
});