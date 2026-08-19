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

  // Both sides are wall-clock, so this is elapsed time only within one calendar day — all
  // that is ever asked of it, and the reason a countdown never spans one (decision 61).
  millisUntil(other: LocalDateTime): number {
    return other.toDate().getTime() - this.toDate().getTime();
  }

  private toDate(): Date {
    return new Date(`${this._value}:00Z`);
  }
}
