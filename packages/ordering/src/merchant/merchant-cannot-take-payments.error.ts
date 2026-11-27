import { DomainError } from '@market-miam/common';

export class MerchantCannotTakePaymentsError extends DomainError {
  override readonly name = 'MerchantCannotTakePaymentsError';

  constructor() {
    super('Merchant cannot take payments');
  }
}
