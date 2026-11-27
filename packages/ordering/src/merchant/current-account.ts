import { Checkout, Payments } from '../payments/payments';
import { CardPayments } from './card-payments';
import { MerchantCannotTakePaymentsError } from './merchant-cannot-take-payments.error';
import { AccountOnRecord } from './account-on-record';

export class CurrentAccount implements AccountOnRecord {
  private cardPayments: CardPayments = 'inactive';
  private issueOpen = false;

  constructor(private readonly accountId: string) {}

  async startCheckout(checkout: Checkout, payments: Payments): Promise<string> {
    if (this.cardPayments !== 'active') {
      throw new MerchantCannotTakePaymentsError();
    }
    return payments.startCheckout(this.accountId, checkout);
  }

  is(accountId: string): boolean {
    return accountId === this.accountId;
  }

  cardPaymentsChangeTo(cardPayments: CardPayments): boolean {
    return cardPayments !== this.cardPayments;
  }

  issueChangesWith(informationDueBy: string | undefined): boolean {
    if (this.issueOpen) {
      return informationDueBy === undefined;
    }
    return informationDueBy !== undefined && this.cardPayments === 'active';
  }

  enable(): void {
    this.cardPayments = 'active';
  }

  disable(): void {
    this.cardPayments = 'inactive';
  }

  openIssue(): void {
    this.issueOpen = true;
  }

  resolveIssue(): void {
    this.issueOpen = false;
  }
}
