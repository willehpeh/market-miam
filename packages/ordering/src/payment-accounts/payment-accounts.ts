import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

// What creating the account came to: made, refused for good by Stripe, or refused because Stripe
// can't use the token, expired or used already.
export type AccountCreation = 'created' | 'refused' | 'token-unusable';

// The vendors' payment accounts as Stripe holds them, where Merchants holds Ordering's own record.
export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
  abstract wasCreatedFor(registration: Registration): Promise<boolean>;
}
