import { CardPayments } from './card-payments';

export class CurrentAccount {
  private cardPayments: CardPayments = 'inactive';
  private issueOpen = false;

  constructor(private readonly accountId: string) {}

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
