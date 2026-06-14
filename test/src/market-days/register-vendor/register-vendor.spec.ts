import { InMemoryEventStore } from '../../in-memory.event-store';
import { Aggregate, DomainEvent, EventStore } from '@market-monster/event-sourcing';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TestRegisterVendor } from './test-data';
import { VendorId } from '@market-monster/shared-kernel';
import { Email, Instant } from '@market-monster/common';

type NewVendorProps = {
  vendorId: VendorId,
  registeredAt: Instant,
  email: Email
}

export class Vendor extends Aggregate {
  static new(props: NewVendorProps): Vendor {
    const vendor = new Vendor();
    const event: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: props.vendorId.value(),
        registeredAt: props.registeredAt.value(),
        email: props.email.value()
      }
    };
    vendor.raise(event);
    return vendor;
  }

  apply(event: DomainEvent): void {
    // not implemented
  }
}

export class Vendors {
  constructor(private readonly store: EventStore) {
  }

  async register(vendor: Vendor, vendorId: VendorId): Promise<void> {
    return this.store.append(vendorId.value(), vendor.raisedEvents(), 0, { vendorId: vendorId.value() });
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
    const vendorId = new VendorId(command.vendorId);
    const registeredAt = new Instant(command.registeredAt);
    const email = new Email(command.email);
    const vendor = Vendor.new({
      vendorId, registeredAt, email
    });
    return this.vendors.register(vendor, vendorId);
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
