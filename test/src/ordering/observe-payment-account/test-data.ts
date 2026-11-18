import { ObservePaymentAccount } from '@market-miam/ordering';
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const OBSERVED_AT = '2026-11-16T09:01:00.000Z';

export class TestObservePaymentAccount {
  static valid(): ObservePaymentAccount {
    const registration = TestStartPaymentAccountRegistration.valid();
    const noticed = TestDetectPaymentAccountUpdate.valid();
    return new ObservePaymentAccount(registration.vendorId, registration.registrationId, noticed.accountId, 'inactive', OBSERVED_AT);
  }

  static with(overrides: Partial<ObservePaymentAccount>): ObservePaymentAccount {
    const defaults = this.valid();
    return new ObservePaymentAccount(
      overrides.vendorId ?? defaults.vendorId,
      overrides.registrationId ?? defaults.registrationId,
      overrides.accountId ?? defaults.accountId,
      overrides.cardPayments ?? defaults.cardPayments,
      overrides.observedAt ?? defaults.observedAt,
    );
  }
}
