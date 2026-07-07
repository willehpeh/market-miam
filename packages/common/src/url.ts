import { DomainError, EmptyValueError } from './errors';

export class InvalidUrlError extends DomainError {
  constructor() {
    super('URL must be a valid http or https URL');
    this.name = 'InvalidUrlError';
  }
}

export class Url {
  private static readonly ALLOWED_SCHEMES = ['http:', 'https:'];

  private readonly _value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    if (this.notUrl(trimmed) || this.notHttpOrHttps(trimmed)) {
      throw new InvalidUrlError();
    }
    this._value = trimmed;
  }

  private notHttpOrHttps(trimmed: string): boolean {
    return !Url.ALLOWED_SCHEMES.includes(new URL(trimmed).protocol);
  }

  private notUrl(trimmed: string): boolean {
    return !URL.canParse(trimmed);
  }

  value(): string {
    return this._value;
  }
}
