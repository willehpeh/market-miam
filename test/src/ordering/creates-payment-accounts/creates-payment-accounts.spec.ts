import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  CreatesPaymentAccounts,
  InMemoryPaymentAccounts,
  InMemoryPublishedStorefronts,
  Merchants,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

describe('Creates Payment Accounts', () => {
  let store: InMemoryEventStore;
  let accounts: InMemoryPaymentAccounts;

  beforeEach(() => {
    store = new InMemoryEventStore();
    accounts = new InMemoryPaymentAccounts();
  });

  async function start(registration = TestStartPaymentAccountRegistration.valid()): Promise<void> {
    const storefronts = new InMemoryPublishedStorefronts();
    storefronts.publish(registration.vendorId);
    await new StartPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)), storefronts).execute(
      registration,
    );
  }

  async function process(): Promise<void> {
    await new PollingSubscription(
      store,
      new CreatesPaymentAccounts(accounts),
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
});
