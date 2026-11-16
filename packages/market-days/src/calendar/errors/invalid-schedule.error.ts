import { DomainError } from '@market-miam/common';

export class InvalidScheduleError extends DomainError {
  override readonly name = 'InvalidScheduleError';

  constructor(message: string) {
    super(message);
  }
}
