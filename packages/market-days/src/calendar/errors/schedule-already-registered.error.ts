import { DomainError } from '@market-miam/common';

export class ScheduleAlreadyRegisteredError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleAlreadyRegisteredError';
  }
}
