import { InvalidScheduleError } from '../errors';

type Frequency = { weeks: number } | 'once';

export class ScheduleFrequency {
  private static readonly WEEKLY: Frequency = { weeks: 1 };

  private readonly _value: Frequency;

  constructor(frequency?: Frequency) {
    if (frequency !== undefined && frequency !== 'once' && frequency.weeks <= 0) {
      throw new InvalidScheduleError('Frequency must be greater than 0');
    }
    this._value = frequency ?? ScheduleFrequency.WEEKLY;
  }

  value(): Frequency {
    return this._value === 'once' ? 'once' : { ...this._value };
  }
}
