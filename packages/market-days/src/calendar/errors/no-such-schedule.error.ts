import { DomainError } from '@market-miam/common';

export class NoSuchScheduleError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NoSuchScheduleError';
  }
}
