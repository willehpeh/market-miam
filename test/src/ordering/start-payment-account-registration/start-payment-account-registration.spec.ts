import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  InMemoryPublishedStorefronts,
  Merchants,
  NotReadyToRegisterPaymentAccount,
  StartPaymentAccountRegistration,
  StartPaymentAccountRegistrationHandler,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';

const STARTED_AT = '2026-11-16T09:00:00.000Z';

describe('Start Payment Account Registration', () => {
  let store: InMemoryEventStore;
  let storefronts: InMemoryPublishedStorefronts;
  let handler: StartPaymentAccountRegistrationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new InMemoryPublishedStorefronts();
    handler = new StartPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)), storefronts);
  });

  // The vendor taps Connect Stripe once their storefront is published; the app minted the
  // registration ID and made the token at the tap (ADR 0068).
  it('starts a published vendor’s registration, carrying their account token', async () => {
    storefronts.publish('vendor-id');

    await handler.execute(
      new StartPaymentAccountRegistration('vendor-id', 'registration-id', 'accttok_test_1', STARTED_AT),
    );

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        streamId: 'ordering-merchant-vendor-id',
        type: 'PaymentAccountRegistrationStarted',
        payload: {
          vendorId: 'vendor-id',
          registrationId: 'registration-id',
          accountToken: 'accttok_test_1',
          startedAt: STARTED_AT,
        },
      }),
    ]);
  });

  // Stripe checks the account against the storefront, and the prefill can't be redone (ADR 0068).
  it('refuses a vendor whose storefront isn’t published, naming what is missing, and records nothing', async () => {
    const failure = await handler
      .execute(new StartPaymentAccountRegistration('vendor-id', 'registration-id', 'accttok_test_1', STARTED_AT))
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(NotReadyToRegisterPaymentAccount);
    expect((failure as NotReadyToRegisterPaymentAccount).missing).toEqual(['publication']);
    expect(store.newEvents()).toEqual([]);
  });
});
