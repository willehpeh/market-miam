import { EmptyValueError } from '@market-miam/common';

export class ScheduleId {

  private readonly _value: string

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    this._value = trimmed;
  }

  value(): string {
    return this._value;
  }
}
