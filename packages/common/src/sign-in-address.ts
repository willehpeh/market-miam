import { Email } from './email';

// The address an account signs in with. Auth0 keeps these in lower case and compares them
// regardless of case, so this does too; what Email refuses, it refuses.
export class SignInAddress {
  private readonly _email: Email;

  constructor(address: string) {
    this._email = new Email(address.toLowerCase());
  }

  value(): string {
    return this._email.value();
  }

  equals(other: SignInAddress): boolean {
    return this.value() === other.value();
  }
}
