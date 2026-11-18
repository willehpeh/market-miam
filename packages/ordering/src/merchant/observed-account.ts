import { CardPayments } from './card-payments';

export type ObservedAccount = {
  registrationId: string;
  accountId: string;
  cardPayments: CardPayments;
  informationDueBy?: string;
};
