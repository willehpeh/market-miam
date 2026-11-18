import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  ChecksPaymentAccounts,
  InMemoryPaymentAccounts,
  Merchants,
  ObservePaymentAccount,
  ObservePaymentAccountHandler,
  PaymentAccounts,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { HandlingCommandGateway } from '../../handling-command-gateway';
import { merchantStream, registrationConfirmed, registrationStarted } from '../merchant-events';
import { noticeStream, updateDetected } from '../notice-events';
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const NOW = '2026-11-16T09:01:00.000Z';

const registration = TestStartPaymentAccountRegistration.valid();
const noticed = TestDetectPaymentAccountUpdate.valid();
const account = {
  accountId: noticed.accountId,
  vendorId: registration.vendorId,
  registrationId: registration.registrationId,
  cardPayments: 'inactive' as const,
};

describe('Checks Payment Accounts', () => {
  let store: InMemoryEventStore;
  let merchants: Merchants;

  beforeEach(() => {
    store = new InMemoryEventStore();
    merchants = new Merchants(new VendorScopedEvents(store));
  });

  function subscribe(accounts: PaymentAccounts): PollingSubscription {
    const commands = new HandlingCommandGateway().handling(ObservePaymentAccount, new ObservePaymentAccountHandler(merchants));
    return new PollingSubscription(
      store,
      new ChecksPaymentAccounts(accounts, commands, clockAt('2026-11-16', NOW)),
      new InMemoryCheckpoint('checks-payment-accounts'),
    );
  }

  it('confirms the registration of the vendor whose account Stripe noticed', async () => {
    store.seedWith(merchantStream(), [registrationStarted()], { vendorId: registration.vendorId });
    store.seedWith(noticeStream(), [updateDetected()]);

    await subscribe(new InMemoryPaymentAccounts([account])).poll();

    expect(await store.load(merchantStream())).toEqual([
      expect.objectContaining(registrationStarted()),
      expect.objectContaining(registrationConfirmed()),
    ]);
  });
});
