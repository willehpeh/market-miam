import { LocalDate } from './local-date';

export class LocalDateRange {

  private readonly _dates: LocalDate[];

  constructor(private readonly _from: LocalDate,
              private readonly _to: LocalDate) {
    this._dates = Array.from({ length: this.length() }, (_, i) => _from.plusDays(i));
  }

  dates(): LocalDate[] {
    return this._dates.slice();
  }

  notBefore(start: LocalDate): LocalDateRange {
    return this._from.isBefore(start) ? new LocalDateRange(start, this._to) : this;
  }

  private length() {
    return this._from.daysUntil(this._to) + 1;
  }
}
