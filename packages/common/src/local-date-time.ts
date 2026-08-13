import { LocalDate } from './local-date';
import { LocalTime } from './local-time';

// Wall-clock time with no zone attached — what a market's opening hours are written in.
// Both halves are fixed-width by their own formats, so the joined value orders
// lexicographically and comparison needs no parsing.
export class LocalDateTime {
  private readonly _value: string;

  constructor(date: LocalDate, private readonly _time: LocalTime) {
    this._value = `${date.value()}T${_time.value()}`;
  }

  time(): LocalTime {
    return this._time;
  }

  isNotAfter(other: LocalDateTime): boolean {
    return this._value <= other._value;
  }
}
