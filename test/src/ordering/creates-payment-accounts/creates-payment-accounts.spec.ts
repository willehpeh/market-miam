import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  AccountCreation,
  CreatesPaymentAccounts,
  FailPaymentAccountRegistration,
  InMemoryPaymentAccounts,
  InMemoryPublishedStorefronts,
  Merchants,
  PaymentAccounts,
  Registration,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const NOW = '2026-11-16T09:00:05.000Z';

class RefusingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('refused' as const);
  }
}

class OnceUnansweredPaymentAccounts extends InMemoryPaymentAccounts {
  private answered = false;

  override createFor(registration: Registration): Promise<AccountCreation> {
    if (!this.answered) {
      this.answered = true;
      return Promise.reject(new Error('Stripe timed out'));
    }
    return super.createFor(registration);
  }
}

describe('Creates Payment Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryPaymentAccounts;
  let gateway: RecordingCommandGateway;

  beforeEach(() => {
    store = new InMemoryEventStore();
    accounts = new InMemoryPaymentAccounts();
    gateway = new RecordingCommandGateway();
  });

  async function start(registration = TestStartPaymentAccountRegistration.valid()): Promise<void> {
    const storefronts = new InMemoryPublishedStorefronts();
    storefronts.publish(registration.vendorId);
    await new StartPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)), storefronts).execute(
      registration,
    );
  }

  function subscribe(using: PaymentAccounts = accounts): PollingSubscription {
    return new PollingSubscription(
      store,
      new CreatesPaymentAccounts(using, gateway, clockAt('2026-11-16', NOW)),
      new InMemoryCheckpoint('creates-payment-accounts'),
    );
  }

  async function process(using: PaymentAccounts = accounts): Promise<void> {
    await subscribe(using).poll();
  }

  it('creates the payment account for a started registration, from its token', async () => {
    const registration = TestStartPaymentAccountRegistration.valid();

    await start(registration);
    await process();

    expect(accounts.all()).toEqual([
      {
        vendorId: registration.vendorId,
        registrationId: registration.registrationId,
        accountToken: registration.accountToken,
      },
    ]);
  });

  it('records the registration failed when Stripe refuses the account for good', async () => {
    const registration = TestStartPaymentAccountRegistration.valid();

    await start(registration);
    await process(new RefusingPaymentAccounts());

    expect(gateway.dispatched).toEqual([
      new FailPaymentAccountRegistration(registration.vendorId, registration.registrationId, NOW),
    ]);
  });

  it('tries the account again when Stripe gives no answer, rather than failing the registration', async () => {
    const registration = TestStartPaymentAccountRegistration.valid();
    const unanswering = new OnceUnansweredPaymentAccounts();
    const subscription = subscribe(unanswering);
    await start(registration);

    await expect(subscription.poll()).rejects.toThrow('Stripe timed out');
    await subscription.poll();

    expect(gateway.dispatched).toEqual([]);
    expect(unanswering.all()).toEqual([
      {
        vendorId: registration.vendorId,
        registrationId: registration.registrationId,
        accountToken: registration.accountToken,
      },
    ]);
  });
});
