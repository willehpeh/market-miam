import { EmptyValueError } from '@market-miam/common';

export class LegalName {

  private readonly _name: string;

  constructor(name: string) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new EmptyValueError('Legal name cannot be empty');
    }
    this._name = trimmed;
  }

  value(): string {
    return this._name;
  }
}
