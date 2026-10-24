import { DomainError, Url } from '@market-miam/common';

export class IncompleteMediatorError extends DomainError {
  constructor() {
    super('A médiateur is named together with its site, or not at all');
  }
}

// Optional (ADR 0054): the vendor owes one under L616-1, but the notice is complete without it.
export class Mediator {

  private readonly _name: string | null;
  private readonly _url: Url | null;

  constructor(name: string | null, url: string | null) {
    const trimmedName = name?.trim() || null;
    const trimmedUrl = url?.trim() || null;
    if ((trimmedName === null) !== (trimmedUrl === null)) {
      throw new IncompleteMediatorError();
    }
    this._name = trimmedName;
    this._url = trimmedUrl === null ? null : new Url(trimmedUrl);
  }

  recorded(): { mediatorName: string | null; mediatorUrl: string | null } {
    return { mediatorName: this._name, mediatorUrl: this._url?.value() ?? null };
  }
}
