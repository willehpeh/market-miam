import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  AccountCreation,
  CreatesPaymentAccounts,
  FailPaymentAccountRegistration,
  FailPaymentAccountRegistrationHandler,
  InMemoryPaymentAccounts,
  InMemoryPublishedStorefronts,
  Merchants,
  PaymentAccounts,
  Registration,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { HandlingCommandGateway } from '../../handling-command-gateway';
import { merchantStream, registrationFailed, registrationStarted } from '../merchant-events';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const NOW = '2026-11-16T09:00:05.000Z';

class RefusingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('refused' as const);
  }
}

class OnceUnansweredPaymentAccounts extends InMemoryPaymentAccounts {
  private timesOutNext = true;

  override createFor(registration: Registration): Promise<AccountCreation> {
    if (this.timesOutNext) {
      this.timesOutNext = false;
      return Promise.reject(new Error('Stripe timed out'));
    }
    return super.createFor(registration);
  }
}

describe('Creates Payment Accounts', () => {
  const registration = TestStartPaymentAccountRegistration.valid();
  const requested: Registration = {
    vendorId: registration.vendorId,
    registrationId: registration.registrationId,
    accountToken: registration.accountToken,
  };

  let store: InMemoryEventStore;
  let merchants: Merchants;

  beforeEach(() => {
    store = new InMemoryEventStore();
    merchants = new Merchants(new VendorScopedEvents(store));
  });

  async function start(): Promise<void> {
    const storefronts = new InMemoryPublishedStorefronts();
    storefronts.publish(registration.vendorId);
    await new StartPaymentAccountRegistrationHandler(merchants, storefronts).execute(registration);
  }

  function subscribe(accounts: PaymentAccounts): PollingSubscription {
    const commands = new HandlingCommandGateway().handling(
      FailPaymentAccountRegistration,
      new FailPaymentAccountRegistrationHandler(merchants),
    );
    return new PollingSubscription(
      store,
      new CreatesPaymentAccounts(accounts, commands, clockAt('2026-11-16', NOW)),
      new InMemoryCheckpoint('creates-payment-accounts'),
    );
  }

  it('creates the payment account for a started registration, from its token', async () => {
    const accounts = new InMemoryPaymentAccounts();
    await start();

    await subscribe(accounts).poll();

    expect(accounts.all()).toEqual([requested]);
  });

  it('records the registration failed when Stripe refuses the account for good', async () => {
    await start();

    await subscribe(new RefusingPaymentAccounts()).poll();

    expect(await store.load(merchantStream())).toEqual([
      expect.objectContaining(registrationStarted()),
      expect.objectContaining(registrationFailed()),
    ]);
  });

  it('tries the account again when Stripe gives no answer, rather than failing the registration', async () => {
    const accounts = new OnceUnansweredPaymentAccounts();
    const subscription = subscribe(accounts);
    await start();

    await subscription.poll().catch(() => undefined);
    await subscription.poll();

    expect(await store.load(merchantStream())).toEqual([expect.objectContaining(registrationStarted())]);
    expect(accounts.all()).toEqual([requested]);
  });
});
