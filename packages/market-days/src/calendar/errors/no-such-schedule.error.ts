import { DomainError } from '@market-miam/common';

export class NoSuchScheduleError extends DomainError {
  override readonly name = 'NoSuchScheduleError';

  constructor(message: string) {
    super(message);
  }
}
