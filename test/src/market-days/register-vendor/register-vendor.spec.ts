import { InMemoryEventStore } from '../../in-memory.event-store';
import { RegisterVendor, RegisterVendorHandler, VendorRegistered, Vendors } from '@market-monster/market-days';
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

  function expectSingleEventFrom(command: RegisterVendor) {
    const expectedEvent: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: command.vendorId,
        registeredAt: command.registeredAt,
        email: command.email
      }
    };

    expect(store.newEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  }
});
