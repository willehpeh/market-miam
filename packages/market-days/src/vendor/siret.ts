import { DomainError } from '@market-miam/common';

export class InvalidSiretError extends DomainError {
  constructor() {
    super('SIRET must be 14 digits with a valid check digit');
  }
}

export class Siret {

  private readonly _siret: string;

  constructor(siret: string) {
    const digits = siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(digits) || !Siret.passesLuhn(digits)) {
      throw new InvalidSiretError();
    }
    this._siret = digits;
  }

  value(): string {
    return this._siret;
  }

  siren(): string {
    return this._siret.slice(0, 9);
  }

  vatNumber(): string {
    const key = (12 + 3 * (Number(this.siren()) % 97)) % 97;
    return `FR${String(key).padStart(2, '0')}${this.siren()}`;
  }

  // ponytail: La Poste's establishments (SIREN 356 000 000) use a different check; no traiteur has one.
  private static passesLuhn(digits: string): boolean {
    const sum = [...digits].reverse().reduce((total, char, index) => {
      const doubled = index % 2 === 1 ? Number(char) * 2 : Number(char);
      return total + (doubled > 9 ? doubled - 9 : doubled);
    }, 0);
    return sum % 10 === 0;
  }
}
