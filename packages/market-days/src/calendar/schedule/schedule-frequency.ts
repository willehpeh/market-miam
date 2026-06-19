import { InvalidScheduleError } from '../errors';

export class ScheduleFrequency {
  private static readonly WEEKLY: { weeks: number } = { weeks: 1 };

  private readonly _value: { weeks: number };

  constructor(frequency?: { weeks: number }) {
    if (!!frequency?.weeks && frequency.weeks <= 0) {
      throw new InvalidScheduleError('Frequency must be greater than 0');
    }
    this._value = frequency ?? ScheduleFrequency.WEEKLY;
  }

  value(): { weeks: number } {
    return { ...this._value };
  }
}
