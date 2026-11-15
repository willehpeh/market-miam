import { PaymentAccountRegistrationFailed, PaymentAccountRegistrationStarted } from '@market-miam/ordering';
import { TestStartPaymentAccountRegistration } from './start-payment-account-registration/test-data';

const registration = TestStartPaymentAccountRegistration.valid();

export const merchantStream = (vendorId = registration.vendorId): string => `ordering-merchant-${vendorId}`;

export const registrationStarted = (
  vendorId = registration.vendorId,
  overrides: Partial<PaymentAccountRegistrationStarted['payload']> = {},
): PaymentAccountRegistrationStarted => ({
  type: 'PaymentAccountRegistrationStarted',
  payload: {
    vendorId,
    registrationId: registration.registrationId,
    accountToken: registration.accountToken,
    startedAt: registration.startedAt,
    ...overrides,
  },
  version: 1,
});

export const registrationFailed = (
  vendorId = registration.vendorId,
  overrides: Partial<PaymentAccountRegistrationFailed['payload']> = {},
): PaymentAccountRegistrationFailed => ({
  type: 'PaymentAccountRegistrationFailed',
  payload: { vendorId, registrationId: registration.registrationId, failedAt: '2026-11-16T09:00:05.000Z', ...overrides },
  version: 1,
});
