import { DomainError, EmptyValueError } from './errors';
import { Instant } from './instant';

export class InvalidDateError extends DomainError {
  constructor() {
    super('Date must be in YYYY-MM-DD format');
    this.name = 'InvalidDateError';
  }
}

export abstract class Clock {
  abstract today(): LocalDate;
  abstract now(): Instant;
}

export class LocalDate {
  private static readonly FORMAT = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  private static readonly DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  private readonly _value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    if (!LocalDate.FORMAT.test(trimmed)) {
      throw new InvalidDateError();
    }
    this._value = trimmed;
  }

  value(): string {
    return this._value;
  }

  isBefore(other: LocalDate): boolean {
    return this._value < other._value;
  }

  dayOfWeek(): string {
    return LocalDate.DAYS[this.toDate().getUTCDay()];
  }

  plusDays(days: number): LocalDate {
    const date = this.toDate();
    date.setUTCDate(date.getUTCDate() + days);
    return new LocalDate(date.toISOString().slice(0, 10));
  }

  private toDate(): Date {
    return new Date(`${this._value}T00:00:00Z`);
  }
}
