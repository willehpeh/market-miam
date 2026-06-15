import { InvalidEmailError } from './errors';

export class Email {

  private readonly _email: string;
  private static readonly EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

  constructor(email: string) {
    if (this.isWrongShape(email)) {
      throw new InvalidEmailError();
    }
    this._email = email;
  }

  private isWrongShape(email: string) {
    return !Email.EMAIL.test(email);
  }

  value(): string {
    return this._email;
  }
}
