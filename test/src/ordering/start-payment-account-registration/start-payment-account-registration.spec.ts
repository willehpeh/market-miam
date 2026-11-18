import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  InMemoryPublishedStorefronts,
  Merchants,
  PaymentAccountAlreadyExistsError,
  RegistrationAlreadyOpenError,
  StartPaymentAccountRegistrationHandler,
  StorefrontNotPublishedError,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { merchantStream, registrationConfirmed, registrationFailed, registrationStarted } from '../merchant-events';
import { TestStartPaymentAccountRegistration } from './test-data';

describe('Start Payment Account Registration', () => {
  let store: InMemoryEventStore;
  let storefronts: InMemoryPublishedStorefronts;
  let handler: StartPaymentAccountRegistrationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new InMemoryPublishedStorefronts();
    handler = new StartPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)), storefronts);
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(merchantStream(), history, { vendorId: 'vendor-id' });

  it('starts a published vendor’s registration, carrying their account token', async () => {
    storefronts.publish('vendor-id');

    await handler.execute(TestStartPaymentAccountRegistration.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: merchantStream(), ...registrationStarted() })]);
  });

  it('refuses a vendor whose storefront isn’t published, recording nothing', async () => {
    await expect(handler.execute(TestStartPaymentAccountRegistration.valid())).rejects.toThrow(StorefrontNotPublishedError);

    expect(store.newEvents()).toEqual([]);
  });

  it('records nothing when the same registration is started again', async () => {
    storefronts.publish('vendor-id');
    given(registrationStarted());

    await handler.execute(TestStartPaymentAccountRegistration.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('refuses another registration while one is open, recording nothing', async () => {
    storefronts.publish('vendor-id');
    given(registrationStarted());

    await expect(
      handler.execute(TestStartPaymentAccountRegistration.with({ registrationId: 'another-registration-id' })),
    ).rejects.toThrow(RegistrationAlreadyOpenError);

    expect(store.newEvents()).toEqual([]);
  });

  it('starts a new registration once the last one failed', async () => {
    storefronts.publish('vendor-id');
    given(registrationStarted(), registrationFailed());

    await handler.execute(TestStartPaymentAccountRegistration.with({ registrationId: 'another-registration-id' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining(registrationStarted('vendor-id', { registrationId: 'another-registration-id' })),
    ]);
  });

  it('refuses a registration once the vendor has a payment account, recording nothing', async () => {
    storefronts.publish('vendor-id');
    given(registrationStarted(), registrationConfirmed());

    await expect(
      handler.execute(TestStartPaymentAccountRegistration.with({ registrationId: 'another-registration-id' })),
    ).rejects.toThrow(PaymentAccountAlreadyExistsError);

    expect(store.newEvents()).toEqual([]);
  });
});
