import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  CreatesPaymentAccounts,
  FailPaymentAccountRegistration,
  InMemoryPaymentAccounts,
  InMemoryPublishedStorefronts,
  Merchants,
  PaymentAccounts,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { RecordingCommandGateway } from '../../recording-command-gateway';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const NOW = '2026-11-16T09:00:05.000Z';

// Refuses every registration for good, as Stripe refuses an account it won't create.
class RefusingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('refused' as const);
  }
}

// Can't use any token, as Stripe answers a token that has expired or was used already.
class TokenRejectingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('token-unusable' as const);
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

  async function process(using: PaymentAccounts = accounts): Promise<void> {
    await new PollingSubscription(
      store,
      new CreatesPaymentAccounts(using, gateway, clockAt('2026-11-16', NOW)),
      new InMemoryCheckpoint('creates-payment-accounts'),
    ).poll();
  }

  // The vendor's tap becomes their account at Stripe, made from the token their browser sent (ADR 0068).
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

  // Stripe won't create it: the registration ends, and the vendor can tap again (ADR 0068).
  it('records the registration failed when Stripe refuses the account for good', async () => {
    const registration = TestStartPaymentAccountRegistration.valid();

    await start(registration);
    await process(new RefusingPaymentAccounts());

    expect(gateway.dispatched).toEqual([
      new FailPaymentAccountRegistration(registration.vendorId, registration.registrationId, NOW),
    ]);
  });

  // A token error only proves a refusal once no account carries the registration: a lost success,
  // retried past the token's hour, answers token_expired too (ADR 0068).
  it('records the registration failed when its token is unusable and no account carries it', async () => {
    const registration = TestStartPaymentAccountRegistration.valid();

    await start(registration);
    await process(new TokenRejectingPaymentAccounts());

    expect(gateway.dispatched).toEqual([
      new FailPaymentAccountRegistration(registration.vendorId, registration.registrationId, NOW),
    ]);
  });
});
