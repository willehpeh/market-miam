import { Checkout, Payments } from '../payments/payments';
import { CardPayments } from './card-payments';
import { MerchantCannotTakePaymentsError } from './merchant-cannot-take-payments.error';

export interface AccountOnRecord {
  startCheckout(checkout: Checkout, payments: Payments): Promise<string>;
  is(accountId: string): boolean;
  cardPaymentsChangeWith(cardPayments: CardPayments): boolean;
  issueChangesWith(informationDueBy: string | undefined): boolean;
  enable(): void;
  disable(): void;
  openIssue(): void;
  resolveIssue(): void;
}

export class NoAccount implements AccountOnRecord {
  async startCheckout(): Promise<string> {
    throw new MerchantCannotTakePaymentsError();
  }

  is(): boolean {
    return false;
  }

  cardPaymentsChangeWith(): boolean {
    return false;
  }

  issueChangesWith(): boolean {
    return false;
  }

  enable(): void {}

  disable(): void {}

  openIssue(): void {}

  resolveIssue(): void {}
}
