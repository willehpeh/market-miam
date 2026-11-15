import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

export type AccountCreation = 'created' | 'refused';

export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
}
