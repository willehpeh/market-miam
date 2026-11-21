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

  detectsIssue(informationDueBy: string | undefined): boolean {
    return informationDueBy !== undefined && this.cardPayments === 'active' && !this.issueOpen;
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
}
