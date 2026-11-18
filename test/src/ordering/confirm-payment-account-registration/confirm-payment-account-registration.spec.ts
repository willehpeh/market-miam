import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  ConfirmPaymentAccountRegistration,
  ConfirmPaymentAccountRegistrationHandler,
  Merchants,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { merchantStream, registrationConfirmed, registrationStarted } from '../merchant-events';

const CONFIRMED_AT = '2026-11-16T09:01:00.000Z';

describe('Confirm Payment Account Registration', () => {
  let store: InMemoryEventStore;
  let handler: ConfirmPaymentAccountRegistrationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new ConfirmPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(merchantStream(), history, { vendorId: 'vendor-id' });

  it('records the open registration confirmed, with the account Stripe made for it', async () => {
    given(registrationStarted());

    await handler.execute(new ConfirmPaymentAccountRegistration('vendor-id', 'registration-id', 'acct_test_1', CONFIRMED_AT));

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: merchantStream(), ...registrationConfirmed() })]);
  });

  it('records nothing when the registration is already confirmed', async () => {
    given(registrationStarted(), registrationConfirmed());

    await handler.execute(new ConfirmPaymentAccountRegistration('vendor-id', 'registration-id', 'acct_test_1', CONFIRMED_AT));

    expect(store.newEvents()).toEqual([]);
  });
});
