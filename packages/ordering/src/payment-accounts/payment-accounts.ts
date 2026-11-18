import { CardPayments } from '../merchant/card-payments';
import { PaymentAccountRegistrationStarted } from '../merchant/events';

export type Registration = Pick<PaymentAccountRegistrationStarted['payload'], 'vendorId' | 'registrationId' | 'accountToken'>;

export type AccountCreation = 'created' | 'refused';

export type PaymentAccount = {
  accountId: string;
  vendorId: string;
  registrationId: string;
  cardPayments: CardPayments;
  informationDueBy?: string;
};

export abstract class PaymentAccounts {
  abstract createFor(registration: Registration): Promise<AccountCreation>;
  abstract find(accountId: string): Promise<PaymentAccount | undefined>;
}
