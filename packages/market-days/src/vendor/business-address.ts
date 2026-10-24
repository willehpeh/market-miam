import { EmptyValueError } from '@market-miam/common';

export class BusinessAddress {

  private readonly _address: string;

  constructor(address: string) {
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      throw new EmptyValueError('Business address cannot be empty');
    }
    this._address = trimmed;
  }

  value(): string {
    return this._address;
  }
}
