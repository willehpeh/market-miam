import { PaymentAccountRegistrationFailed } from './payment-account-registration-failed';
import { PaymentAccountRegistrationStarted } from './payment-account-registration-started';

export type MerchantEvent = PaymentAccountRegistrationStarted | PaymentAccountRegistrationFailed;
