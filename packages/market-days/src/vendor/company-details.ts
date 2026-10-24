import { DomainError } from '@market-miam/common';

export class IncompleteCompanyDetailsError extends DomainError {
  constructor() {
    super('A société gives its legal form, capital, greffe and representative together, or none of them');
  }
}

type Fields = {
  legalForm: string | null;
  shareCapital: string | null;
  registryCity: string | null;
  legalRepresentative: string | null;
};

// What a société owes on top of an entrepreneur individuel (ADR 0054). All four or none:
// an EI has no capital and is its own directeur de la publication.
export class CompanyDetails {

  private readonly _fields: Fields;

  constructor(fields: Fields) {
    const legalForm = blankToNull(fields.legalForm);
    const shareCapital = blankToNull(fields.shareCapital);
    const registryCity = blankToNull(fields.registryCity);
    const legalRepresentative = blankToNull(fields.legalRepresentative);
    const given = [legalForm, shareCapital, registryCity, legalRepresentative].filter((value) => value !== null);
    if (given.length > 0 && given.length < 4) {
      throw new IncompleteCompanyDetailsError();
    }
    this._fields = { legalForm, shareCapital, registryCity, legalRepresentative };
  }

  recorded(): Fields {
    return { ...this._fields };
  }
}

function blankToNull(value: string | null): string | null {
  return value?.trim() || null;
}
