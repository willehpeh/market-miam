import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Merchants, ObservePaymentAccountHandler } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { accountEnabled, merchantStream, registrationConfirmed, registrationStarted } from '../merchant-events';
import { TestObservePaymentAccount } from './test-data';

describe('Observe Payment Account', () => {
  let store: InMemoryEventStore;
  let handler: ObservePaymentAccountHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new ObservePaymentAccountHandler(new Merchants(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(merchantStream(), history, { vendorId: 'vendor-id' });

  it('confirms the open registration it observes, with the account Stripe made for it', async () => {
    given(registrationStarted());

    await handler.execute(TestObservePaymentAccount.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: merchantStream(), ...registrationConfirmed() })]);
  });

  it('records nothing when the registration is already confirmed', async () => {
    given(registrationStarted(), registrationConfirmed());

    await handler.execute(TestObservePaymentAccount.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('records nothing for a registration other than the open one', async () => {
    given(registrationStarted('vendor-id', { registrationId: 'another-registration-id' }));

    await handler.execute(TestObservePaymentAccount.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('records the account enabled when its card payments become active', async () => {
    given(registrationStarted(), registrationConfirmed());

    await handler.execute(TestObservePaymentAccount.with({ cardPayments: 'active' }));

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: merchantStream(), ...accountEnabled() })]);
  });

  it("records nothing about an account other than the vendor's current one", async () => {
    given(registrationStarted(), registrationConfirmed());

    await handler.execute(TestObservePaymentAccount.with({ accountId: 'acct_another_account', cardPayments: 'active' }));

    expect(store.newEvents()).toEqual([]);
  });
});
