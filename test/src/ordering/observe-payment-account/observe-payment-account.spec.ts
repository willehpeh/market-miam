import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Merchants, ObservePaymentAccountHandler } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import {
  accountEnabled,
  issueDetected,
  merchantStream,
  registrationConfirmed,
  registrationFailed,
  registrationStarted,
} from '../merchant-events';
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

  it('records nothing when card payments are still active', async () => {
    given(registrationStarted(), registrationConfirmed(), accountEnabled());

    await handler.execute(TestObservePaymentAccount.with({ cardPayments: 'active' }));

    expect(store.newEvents()).toEqual([]);
  });

  it('records nothing about an account left over from a registration that failed', async () => {
    given(
      registrationStarted('vendor-id', { registrationId: 'failed-registration-id' }),
      registrationFailed('vendor-id', { registrationId: 'failed-registration-id' }),
      registrationStarted(),
      registrationConfirmed(),
    );

    await handler.execute(
      TestObservePaymentAccount.with({ registrationId: 'failed-registration-id', accountId: 'acct_left_over', cardPayments: 'active' }),
    );

    expect(store.newEvents()).toEqual([]);
  });

  it('records the account disabled when its card payments stop being active', async () => {
    given(registrationStarted(), registrationConfirmed(), accountEnabled());

    await handler.execute(TestObservePaymentAccount.with({ cardPayments: 'inactive' }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        streamId: merchantStream(),
        type: 'PaymentAccountDisabled',
        payload: { vendorId: 'vendor-id', disabledAt: '2026-11-16T09:01:00.000Z' },
      }),
    ]);
  });

  it('records an issue when Stripe wants information from an enabled account by a deadline', async () => {
    given(registrationStarted(), registrationConfirmed(), accountEnabled());

    await handler.execute(TestObservePaymentAccount.with({ cardPayments: 'active', informationDueBy: '2026-12-01T00:00:00.000Z' }));

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: merchantStream(), ...issueDetected() })]);
  });
});
