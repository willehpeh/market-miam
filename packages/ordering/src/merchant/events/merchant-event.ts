import { PaymentAccountDisabled } from './payment-account-disabled';
import { PaymentAccountEnabled } from './payment-account-enabled';
import { PaymentAccountIssueDetected } from './payment-account-issue-detected';
import { PaymentAccountRegistrationConfirmed } from './payment-account-registration-confirmed';
import { PaymentAccountRegistrationFailed } from './payment-account-registration-failed';
import { PaymentAccountRegistrationStarted } from './payment-account-registration-started';

export type MerchantEvent =
  | PaymentAccountRegistrationStarted
  | PaymentAccountRegistrationFailed
  | PaymentAccountRegistrationConfirmed
  | PaymentAccountEnabled
  | PaymentAccountDisabled
  | PaymentAccountIssueDetected;
