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
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const NOW = '2026-11-16T09:01:00.000Z';

const registration = TestStartPaymentAccountRegistration.valid();
const noticed = TestDetectPaymentAccountUpdate.valid();
const account = { accountId: noticed.accountId, vendorId: registration.vendorId, registrationId: registration.registrationId };

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
    store.seedWith(noticeStream(), [updateDetected()]);

    await subscribe(new InMemoryPaymentAccounts([account])).poll();

    expect(gateway.dispatched).toEqual([
      new ConfirmPaymentAccountRegistration(registration.vendorId, registration.registrationId, noticed.accountId, NOW),
    ]);
  });
});
