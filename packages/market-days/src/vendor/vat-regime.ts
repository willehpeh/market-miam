import { DomainError } from '@market-miam/common';
import { Siret } from './siret';

export class InvalidVatRegimeError extends DomainError {
  constructor() {
    super('TVA regime must be assujetti or franchise');
  }
}

export class VatRegime {

  private static readonly REGIMES = ['assujetti', 'franchise'];

  private readonly _regime: string;

  constructor(regime: string) {
    if (!VatRegime.REGIMES.includes(regime)) {
      throw new InvalidVatRegimeError();
    }
    this._regime = regime;
  }

  value(): string {
    return this._regime;
  }

  // Under the franchise en base (art. 293 B du CGI) there is no TVA number to publish.
  vatNumberFor(siret: Siret): string | null {
    return this._regime === 'franchise' ? null : siret.vatNumber();
  }
}
