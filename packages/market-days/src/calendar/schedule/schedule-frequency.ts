export class ScheduleFrequency {
  private static readonly WEEKLY: { weeks: number } = { weeks: 1 };

  private readonly _value: { weeks: number };

  constructor(frequency?: { weeks: number }) {
    this._value = frequency ?? ScheduleFrequency.WEEKLY;
  }

  value(): { weeks: number } {
    return { ...this._value };
  }
}
