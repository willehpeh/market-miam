import { LocalDate } from './local-date';

export class Week {
  private static readonly DAYS_FROM_MONDAY: Record<string, number> = {
    MON: 0,
    TUE: 1,
    WED: 2,
    THU: 3,
    FRI: 4,
    SAT: 5,
    SUN: 6
  };

  private constructor(private readonly _monday: LocalDate) {}

  static containing(date: LocalDate): Week {
    const monday = date.plusDays(-Week.DAYS_FROM_MONDAY[date.dayOfWeek()]);
    return Week.starting(monday);
  }

  private static starting(date: LocalDate): Week {
    return new Week(date);
  }

  countUntil(other: Week): number {
    return this._monday.daysUntil(other._monday) / 7;
  }
}
