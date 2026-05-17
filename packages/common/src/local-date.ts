import { EmptyValueError } from './errors';

export class InvalidDateError extends Error {
  constructor() {
    super('Date must be in YYYY-MM-DD format');
    this.name = 'InvalidDateError';
  }
}

export class LocalDate {
  private static readonly FORMAT = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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

  static today(): LocalDate {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return new LocalDate(`${year}-${month}-${day}`);
  }

  value(): string {
    return this._value;
  }

  isBefore(other: LocalDate): boolean {
    return this._value < other._value;
  }
}
