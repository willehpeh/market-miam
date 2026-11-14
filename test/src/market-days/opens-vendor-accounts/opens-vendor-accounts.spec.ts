import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  AccountOpening,
  EraseVendor,
  EraseVendorHandler,
  InMemoryVendorAccounts,
  InviteVendorHandler,
  OpensVendorAccounts,
  VendorAccounts,
  VendorScopedEvents,
  Vendors,
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { TestInviteVendor } from '../invite-vendor/test-data';

const NOW = '2026-11-11T09:00:05.000Z';

// Refuses every address, as Auth0 refuses one it finds malformed.
class RefusingVendorAccounts extends InMemoryVendorAccounts {
  override openFor(): Promise<AccountOpening> {
    return Promise.resolve('email-refused');
  }
}

describe('Opens Vendor Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryVendorAccounts;
  let gateway: RecordingCommandGateway;

  beforeEach(() => {
    store = new InMemoryEventStore();
    accounts = new InMemoryVendorAccounts();
    gateway = new RecordingCommandGateway();
  });

  const vendors = (): Vendors => new Vendors(new VendorScopedEvents(store));

  async function invite(invitation = TestInviteVendor.valid()): Promise<void> {
    await new InviteVendorHandler(vendors()).execute(invitation);
  }

  async function process(using: VendorAccounts = accounts): Promise<void> {
    await new PollingSubscription(
      store,
      new OpensVendorAccounts(vendors(), using, gateway, clockAt('2026-11-11', NOW)),
      new InMemoryCheckpoint('opens-vendor-accounts'),
    ).poll();
  }

  it('opens an account for an invited vendor', async () => {
    const invitation = TestInviteVendor.valid();

    await invite(invitation);
    await process();

    expect(accounts.all()).toEqual([{ vendorId: invitation.vendorId, email: invitation.email }]);
  });

  // The invitation lost a race for its address: it can never become an account (ADR 0060).
  it("erases an invitation whose email already holds another vendor's account", async () => {
    const invitation = TestInviteVendor.valid();
    accounts = new InMemoryVendorAccounts([{ email: invitation.email, vendorId: 'another-vendor' }]);

    await invite(invitation);
    await process();

    expect(gateway.dispatched).toEqual([new EraseVendor(invitation.vendorId, NOW)]);
  });

  // Retried, it would fail forever and hold up every invitation behind it.
  it('erases an invitation whose address Auth0 refuses', async () => {
    const invitation = TestInviteVendor.valid();
    await invite(invitation);

    await process(new RefusingVendorAccounts());

    expect(gateway.dispatched).toEqual([new EraseVendor(invitation.vendorId, NOW)]);
  });

  // Erasure destroyed the email's key before the processor reached the invitation (ADR 0058).
  it('skips a vendor erased before their account was opened', async () => {
    const invitation = TestInviteVendor.valid();
    await invite(invitation);
    await new EraseVendorHandler(vendors()).execute(new EraseVendor(invitation.vendorId, '2026-11-11T09:00:01.000Z'));

    await process();

    expect(accounts.all()).toEqual([]);
    expect(gateway.dispatched).toEqual([]);
  });
});
