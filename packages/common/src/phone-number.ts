export class PhoneNumber {

  private readonly _phone: string;

  constructor(phone: string) {
    this._phone = phone.trim();
  }

  value(): string {
    return this._phone;
  }
}
