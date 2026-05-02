import { InvalidUrlError } from './invalid-url.error';

export class Url {
  private readonly _value: string;

  constructor(value: string) {
    if (this.isInvalidUrl(value) || this.isUnsafeSchema(value)) {
      throw new InvalidUrlError();
    }
    this._value = value;
  }

  value(): string {
    return this._value;
  }

  equals(other: Url): boolean {
    return this._value === other._value;
  }

  private isUnsafeSchema(value: string) {
    return !['http:', 'https:'].includes(new URL(value).protocol);
  }

  private isInvalidUrl(value: string) {
    return !URL.canParse(value);
  }
}
