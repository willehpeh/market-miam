import { DomainError } from '@market-miam/common';

export class InvalidScheduleError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScheduleError';
  }
}
