import {
  CommandDispatcher,
  InMemoryCheckpoint,
  InMemoryEventStore,
  InMemorySubscription,
} from '@market-monster/event-sourcing';
import { Command } from '@nestjs/cqrs';
import {
  OpenStorefront,
  RegisterVendorHandler,
  StorefrontOpener,
  Vendors,
} from '@market-monster/market-days';
import { TestRegisterVendor } from '../register-vendor/test-data';

class RecordingCommandDispatcher extends CommandDispatcher {
  readonly dispatched: Command<unknown>[] = [];

  async execute<R>(command: Command<R>): Promise<R> {
    this.dispatched.push(command);
    return undefined as R;
  }
}

describe('StorefrontOpener', () => {
  let store: InMemoryEventStore;
  let vendors: Vendors;
  let dispatcher: RecordingCommandDispatcher;
  let subscription: InMemorySubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(store);
    dispatcher = new RecordingCommandDispatcher();
    subscription = new InMemorySubscription(
      store,
      new StorefrontOpener(dispatcher),
      new InMemoryCheckpoint('storefront-opener'),
    );
  });

  it('opens a storefront for a vendor that has registered', async () => {
    const command = TestRegisterVendor.valid();
    await new RegisterVendorHandler(vendors).execute(command);

    await subscription.poll();

    expect(dispatcher.dispatched).toEqual([new OpenStorefront(command.vendorId)]);
  });
});
