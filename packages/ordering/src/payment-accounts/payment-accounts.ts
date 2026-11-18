import { ObservedAccount } from '../merchant/observed-account';
import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

export type AccountCreation = 'created' | 'refused';

export type PaymentAccount = ObservedAccount & { vendorId: string };

export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
  abstract find(accountId: string): Promise<PaymentAccount | undefined>;
}
