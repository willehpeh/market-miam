import { LocalDate } from '@market-miam/common';
import { InvalidDateRangeError } from './errors/invalid-date-range.error';

export class DateRange {
  constructor(private readonly _from: LocalDate, private readonly _to: LocalDate) {
    if (_to.isBefore(_from)) {
      throw new InvalidDateRangeError('End date must not be before start date');
    }
  }

  value(): { from: string; to: string } {
    return { from: this._from.value(), to: this._to.value() };
  }
}
