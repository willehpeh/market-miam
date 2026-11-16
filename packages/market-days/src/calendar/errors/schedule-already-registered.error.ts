import { DomainError } from '@market-miam/common';

export class ScheduleAlreadyRegisteredError extends DomainError {
  override readonly name = 'ScheduleAlreadyRegisteredError';

  constructor(message: string) {
    super(message);
  }
}
