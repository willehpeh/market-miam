import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

// What creating the account came to: made, or refused for good by Stripe.
export type AccountCreation = 'created' | 'refused';

// The vendors' payment accounts as Stripe holds them, where Merchants holds Ordering's own record.
export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
}
