import { PaymentAccountRegistrationFailed, PaymentAccountRegistrationStarted } from '@market-miam/ordering';

// The events a merchant spec seeds as its Given, typed against the domain's event types, as
// vendor-events.ts does for Market Days. Defaults match TestStartPaymentAccountRegistration.valid().
// Seed them on `merchantStream(vendorId)`.
export const merchantStream = (vendorId = 'vendor-id'): string => `ordering-merchant-${vendorId}`;

export const registrationStarted = (
  vendorId = 'vendor-id',
  overrides: Partial<PaymentAccountRegistrationStarted['payload']> = {},
): PaymentAccountRegistrationStarted => ({
  type: 'PaymentAccountRegistrationStarted',
  payload: {
    vendorId,
    registrationId: 'registration-id',
    accountToken: 'accttok_test_1',
    startedAt: '2026-11-16T09:00:00.000Z',
    ...overrides,
  },
  version: 1,
});

export const registrationFailed = (
  vendorId = 'vendor-id',
  overrides: Partial<PaymentAccountRegistrationFailed['payload']> = {},
): PaymentAccountRegistrationFailed => ({
  type: 'PaymentAccountRegistrationFailed',
  payload: { vendorId, registrationId: 'registration-id', failedAt: '2026-11-16T09:00:05.000Z', ...overrides },
  version: 1,
});
