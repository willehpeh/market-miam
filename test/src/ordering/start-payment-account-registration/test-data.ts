import { StartPaymentAccountRegistration } from '@market-miam/ordering';

export const STARTED_AT = '2026-11-16T09:00:00.000Z';

export class TestStartPaymentAccountRegistration {
  static valid(): StartPaymentAccountRegistration {
    return new StartPaymentAccountRegistration('vendor-id', 'registration-id', 'accttok_test_1', STARTED_AT);
  }

  static with(overrides: Partial<StartPaymentAccountRegistration>): StartPaymentAccountRegistration {
    const defaults = this.valid();
    return new StartPaymentAccountRegistration(
      overrides.vendorId ?? defaults.vendorId,
      overrides.registrationId ?? defaults.registrationId,
      overrides.accountToken ?? defaults.accountToken,
      overrides.startedAt ?? defaults.startedAt,
    );
  }
}
