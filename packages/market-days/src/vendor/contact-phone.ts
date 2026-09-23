import { EmptyValueError } from '@market-miam/common';

export class ContactPhone {

  private readonly _phone: string;

  constructor(phone: string) {
    const trimmed = phone.trim();
    if (trimmed.length === 0) {
      throw new EmptyValueError('Contact phone cannot be empty');
    }
    this._phone = trimmed;
  }

  value(): string {
    return this._phone;
  }
}
