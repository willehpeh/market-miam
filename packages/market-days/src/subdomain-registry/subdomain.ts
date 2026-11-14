import { InvalidSubdomainError } from './invalid-subdomain.error';
import { ReservedSubdomainError } from './reserved-subdomain.error';

// A DNS label a storefront can live at: 3 to 63 lower-case letters, digits and hyphens,
// starting and ending with a letter or a digit, with no `--` (ADR 0065).
const LABEL = /^(?!.*--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

// Hosts with services of their own in render.yaml, where a vendor would never be reached, and
// hosts kept for what Market Miam may serve.
const RESERVED = new Set(['admin', 'api', 'app', 'www', 'mail', 'staging', 'status']);

export class Subdomain {
  private readonly _subdomain: string;

  // In lower case, as browsers write host names and the registry compares them.
  constructor(subdomain: string) {
    const label = subdomain.toLowerCase();
    if (!LABEL.test(label)) {
      throw new InvalidSubdomainError();
    }
    if (RESERVED.has(label)) {
      throw new ReservedSubdomainError();
    }
    this._subdomain = label;
  }

  value(): string {
    return this._subdomain;
  }
}
