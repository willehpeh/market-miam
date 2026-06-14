export class Instant {
  constructor(private readonly _registeredAt: string) {}

  value(): string {
    return this._registeredAt;
  }
}

