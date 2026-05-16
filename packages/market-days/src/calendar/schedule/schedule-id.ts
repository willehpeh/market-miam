export class ScheduleId {

  constructor(private readonly _value: string) {}

  value(): string {
    return this._value;
  }
}
