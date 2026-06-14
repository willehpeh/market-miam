export class Email {
  constructor(private readonly _email: string) {}

  value(): string {
    return this._email;
  }
}
