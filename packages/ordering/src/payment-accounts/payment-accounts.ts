import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

export type AccountCreation = 'created' | 'refused' | 'token-unusable';

export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
  abstract wasCreatedFor(registration: Registration): Promise<boolean>;
}
