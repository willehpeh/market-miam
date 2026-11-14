import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  ClosesVendorAccounts,
  EraseVendor,
  EraseVendorHandler,
  InMemoryVendorAccounts,
  RecordVendorAccountClosed,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { vendorRegistered, vendorStream } from '../vendor-events';

const NOW = '2026-11-14T09:00:05.000Z';

describe('Closes Vendor Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryVendorAccounts;
  let gateway: RecordingCommandGateway;

  beforeEach(() => {
    store = new InMemoryEventStore();
    gateway = new RecordingCommandGateway();
  });

  async function erase(vendorId = 'vendor-id'): Promise<void> {
    await new EraseVendorHandler(new Vendors(new VendorScopedEvents(store))).execute(
      new EraseVendor(vendorId, '2026-11-14T09:00:00.000Z'),
    );
  }

  async function process(): Promise<void> {
    await new PollingSubscription(
      store,
      new ClosesVendorAccounts(accounts, gateway, clockAt('2026-11-14', NOW)),
      new InMemoryCheckpoint('closes-vendor-accounts'),
    ).poll();
  }

  it("closes an erased vendor's account", async () => {
    accounts = new InMemoryVendorAccounts([{ email: 'vendor@domain.com', vendorId: 'vendor-id' }]);
    store.seedWith(vendorStream(), [vendorRegistered()], { vendorId: 'vendor-id' });

    await erase();
    await process();

    expect(accounts.all()).toEqual([]);
  });

  // The proof the erasure finished, kept after Auth0's own logs have faded (ADR 0063).
  it("records the erased vendor's account closed", async () => {
    accounts = new InMemoryVendorAccounts([{ email: 'vendor@domain.com', vendorId: 'vendor-id' }]);
    store.seedWith(vendorStream(), [vendorRegistered()], { vendorId: 'vendor-id' });

    await erase();
    await process();

    expect(gateway.dispatched).toEqual([new RecordVendorAccountClosed('vendor-id', NOW)]);
  });
});
