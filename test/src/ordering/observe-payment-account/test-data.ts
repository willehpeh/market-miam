import { ObservedAccount, ObservePaymentAccount } from '@market-miam/ordering';
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';
import { TestStartPaymentAccountRegistration } from '../start-payment-account-registration/test-data';

const OBSERVED_AT = '2026-11-16T09:01:00.000Z';

type Overrides = Partial<ObservedAccount> & { vendorId?: string; observedAt?: string };

export class TestObservePaymentAccount {
  static valid(): ObservePaymentAccount {
    const registration = TestStartPaymentAccountRegistration.valid();
    const noticed = TestDetectPaymentAccountUpdate.valid();
    return new ObservePaymentAccount(
      registration.vendorId,
      { registrationId: registration.registrationId, accountId: noticed.accountId, cardPayments: 'inactive' },
      OBSERVED_AT,
    );
  }

  static with({ vendorId, observedAt, ...account }: Overrides): ObservePaymentAccount {
    const defaults = this.valid();
    return new ObservePaymentAccount(
      vendorId ?? defaults.vendorId,
      { ...defaults.account, ...account },
      observedAt ?? defaults.observedAt,
    );
  }
}
