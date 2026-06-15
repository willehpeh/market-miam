import { InvalidInstantError } from './errors';

export class Instant {

  private static readonly ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  private readonly _registeredAt: string;

  constructor(registeredAt: string) {
    if (this.isWrongShape(registeredAt) || this.isInvalidIsoString(registeredAt)) {
      throw new InvalidInstantError();
    }
    this._registeredAt = registeredAt;
  }

  private isInvalidIsoString(registeredAt: string) {
    const parsed = new Date(registeredAt);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString() !== registeredAt;
  }

  private isWrongShape(registeredAt: string) {
    return !Instant.ISO_INSTANT.test(registeredAt);
  }

  value(): string {
    return this._registeredAt;
  }
}

