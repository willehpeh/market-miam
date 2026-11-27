import { NewCheckout } from '../payments/payments';
import { CardPayments } from './card-payments';
import { MerchantCannotTakePaymentsError } from './merchant-cannot-take-payments.error';

export interface AccountOnRecord {
  checkoutFor(checkout: Omit<NewCheckout, 'accountId'>): NewCheckout;
  is(accountId: string): boolean;
  cardPaymentsChangeTo(cardPayments: CardPayments): boolean;
  issueChangesWith(informationDueBy: string | undefined): boolean;
  enable(): void;
  disable(): void;
  openIssue(): void;
  resolveIssue(): void;
}

export class NoAccount implements AccountOnRecord {
  checkoutFor(): NewCheckout {
    throw new MerchantCannotTakePaymentsError();
  }

  is(): boolean {
    return false;
  }

  cardPaymentsChangeTo(): boolean {
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
