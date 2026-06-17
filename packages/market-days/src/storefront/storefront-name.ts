import { EmptyValueError } from '@market-monster/common';

export class StorefrontName {

  private readonly _name: string

  constructor(name: string) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new EmptyValueError('Storefront name cannot be empty');
    }
    this._name = trimmed;
  }

  value(): string {
    return this._name;
  }
}
