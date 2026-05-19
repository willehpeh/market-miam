import { EmptyValueError } from './errors';

export class InvalidTimeError extends Error {
  constructor() {
    super('Time must be in HH:mm format (24-hour)');
    this.name = 'InvalidTimeError';
  }
}

export class LocalTime {
  private static readonly FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

  private readonly _value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    if (!LocalTime.FORMAT.test(trimmed)) {
      throw new InvalidTimeError();
    }
    this._value = trimmed;
  }

  value(): string {
    return this._value;
  }
}
