import { DomainError } from '@market-miam/common';

export class MerchantCannotTakePaymentsError extends DomainError {
  override readonly name = 'MerchantCannotTakePaymentsError';
  readonly reason = 'not-taking-orders';

  constructor() {
    super('Merchant cannot take payments');
  }
}
