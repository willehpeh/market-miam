import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  InMemoryPublishedStorefronts,
  Merchants,
  StartPaymentAccountRegistrationHandler,
  StorefrontNotPublishedError,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { STARTED_AT, TestStartPaymentAccountRegistration } from './test-data';

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

    await handler.execute(TestStartPaymentAccountRegistration.valid());

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
  it('refuses a vendor whose storefront isn’t published, recording nothing', async () => {
    await expect(handler.execute(TestStartPaymentAccountRegistration.valid())).rejects.toThrow(StorefrontNotPublishedError);

    expect(store.newEvents()).toEqual([]);
  });
});
