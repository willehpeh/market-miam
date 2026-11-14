import { InvalidSubdomainError } from './invalid-subdomain.error';

// A DNS label a storefront can live at: 3 to 63 lower-case letters, digits and hyphens,
// starting and ending with a letter or a digit, with no `--` (ADR 0065).
const LABEL = /^(?!.*--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export class Subdomain {
  private readonly _subdomain: string;

  constructor(subdomain: string) {
    if (!LABEL.test(subdomain)) {
      throw new InvalidSubdomainError();
    }
    this._subdomain = subdomain;
  }

  value(): string {
    return this._subdomain;
  }
}
