import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { FailPaymentAccountRegistration, FailPaymentAccountRegistrationHandler, Merchants } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { merchantStream, registrationFailed, registrationStarted } from '../merchant-events';

const FAILED_AT = '2026-11-16T09:00:05.000Z';

describe('Fail Payment Account Registration', () => {
  let store: InMemoryEventStore;
  let handler: FailPaymentAccountRegistrationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new FailPaymentAccountRegistrationHandler(new Merchants(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(merchantStream(), history, { vendorId: 'vendor-id' });

  // Stripe refused the account for good: the registration ends (ADR 0068).
  it('records the open registration failed', async () => {
    given(registrationStarted());

    await handler.execute(new FailPaymentAccountRegistration('vendor-id', 'registration-id', FAILED_AT));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        streamId: merchantStream(),
        type: 'PaymentAccountRegistrationFailed',
        payload: { vendorId: 'vendor-id', registrationId: 'registration-id', failedAt: FAILED_AT },
      }),
    ]);
  });

  // The same failure arriving twice, as a retried processor would send it: recorded once.
  it('records nothing when the registration has already failed', async () => {
    given(registrationStarted(), registrationFailed());

    await handler.execute(new FailPaymentAccountRegistration('vendor-id', 'registration-id', FAILED_AT));

    expect(store.newEvents()).toEqual([]);
  });

  // A failure for an older registration must not close the one now open.
  it('records nothing when another registration is open', async () => {
    given(
      registrationStarted(),
      registrationFailed(),
      registrationStarted('vendor-id', { registrationId: 'another-registration-id' }),
    );

    await handler.execute(new FailPaymentAccountRegistration('vendor-id', 'registration-id', FAILED_AT));

    expect(store.newEvents()).toEqual([]);
  });
});
