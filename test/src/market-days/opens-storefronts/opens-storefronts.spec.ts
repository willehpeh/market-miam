import { VendorScopedEvents } from '@market-miam/market-days';
import {
  InMemoryCheckpoint,
  InMemoryEventStore,
  PollingSubscription,
} from '@market-miam/event-sourcing';
import {
  OpenStorefront,
  RegisterVendorHandler,
  OpensStorefronts,
  Vendors,
} from '@market-miam/market-days';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { TestRegisterVendor } from '../register-vendor/test-data';

describe('Opens Storefronts', () => {
  let store: InMemoryEventStore;
  let vendors: Vendors;
  let gateway: RecordingCommandGateway;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    vendors = new Vendors(new VendorScopedEvents(store));
    gateway = new RecordingCommandGateway();
    subscription = new PollingSubscription(
      store,
      new OpensStorefronts(gateway),
      new InMemoryCheckpoint('storefront-opener'),
    );
  });

  it('opens a storefront for a vendor that has registered', async () => {
    const command = TestRegisterVendor.valid();
    await new RegisterVendorHandler(vendors).execute(command);

    await subscription.poll();

    expect(gateway.dispatched).toEqual([new OpenStorefront(command.vendorId)]);
  });
});
