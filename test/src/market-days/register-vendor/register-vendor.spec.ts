import { InMemoryEventStore } from '../../in-memory.event-store';
import { Aggregate, DomainEvent, EventStore } from '@market-monster/event-sourcing';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TestRegisterVendor } from './test-data';

export class Vendor extends Aggregate {
  apply(event: DomainEvent): void {
    // not implemented
  }

  static register(): Vendor {
    const vendor = new Vendor();
    const event = TestRegisterVendor.valid();
    vendor.raise({
      type: 'VendorRegistered',
      payload: { ...event }
    });
    return vendor;
  }
}

export class Vendors {
  constructor(private readonly store: EventStore) {

  }
  async register(vendor: Vendor): Promise<void> {
    const event = vendor.raisedEvents()[0] as VendorRegistered;
    let vendorId = event.payload.vendorId;
    return this.store.append(vendorId, [event], 0, { vendorId });
  }
}

export class RegisterVendor extends Command<void> {
  constructor(readonly vendorId: string,
              readonly registeredAt: string,
              readonly email: string) {
    super();
  }
}

@CommandHandler(RegisterVendor)
export class RegisterVendorHandler implements ICommandHandler<RegisterVendor> {
  constructor(private readonly vendors: Vendors) {

  }

  async execute(command: RegisterVendor): Promise<void> {
    const vendor = Vendor.register();
    return this.vendors.register(vendor);
  }

}

export type VendorRegistered = DomainEvent<'VendorRegistered', {
  vendorId: string,
  registeredAt: string,
  email: string
}>;

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
