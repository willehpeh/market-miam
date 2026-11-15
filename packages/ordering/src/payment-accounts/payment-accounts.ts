import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

// The vendors' payment accounts as Stripe holds them, where Merchants holds Ordering's own record.
export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<void>;
}
