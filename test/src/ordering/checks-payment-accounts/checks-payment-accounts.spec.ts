import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  ChecksPaymentAccounts,
  ConfirmPaymentAccountRegistration,
  InMemoryPaymentAccounts,
  PaymentAccounts,
} from '@market-miam/ordering';
import { clockAt } from '../../clock-at';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { noticeStream, updateDetected } from '../notice-events';

const NOW = '2026-11-16T09:01:00.000Z';

describe('Checks Payment Accounts', () => {
  let store: InMemoryEventStore;
  let gateway: RecordingCommandGateway;

  beforeEach(() => {
    store = new InMemoryEventStore();
    gateway = new RecordingCommandGateway();
  });

  function subscribe(accounts: PaymentAccounts): PollingSubscription {
    return new PollingSubscription(
      store,
      new ChecksPaymentAccounts(accounts, gateway, clockAt('2026-11-16', NOW)),
      new InMemoryCheckpoint('checks-payment-accounts'),
    );
  }

  it('confirms the registration of the vendor whose account Stripe noticed', async () => {
    const accounts = new InMemoryPaymentAccounts([
      { accountId: 'acct_test_1', vendorId: 'vendor-id', registrationId: 'registration-id' },
    ]);
    store.seedWith(noticeStream(), [updateDetected({ accountId: 'acct_test_1' })]);

    await subscribe(accounts).poll();

    expect(gateway.dispatched).toEqual([
      new ConfirmPaymentAccountRegistration('vendor-id', 'registration-id', 'acct_test_1', NOW),
    ]);
  });
});
