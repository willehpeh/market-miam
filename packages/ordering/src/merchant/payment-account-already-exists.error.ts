import { DomainError } from '@market-miam/common';

export class PaymentAccountAlreadyExistsError extends DomainError {
  override readonly name = 'PaymentAccountAlreadyExistsError';

  constructor() {
    super('The vendor already has a payment account');
  }
}
