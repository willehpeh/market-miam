import { VendorLegalIdentityProvided } from './events';

type Recorded = VendorLegalIdentityProvided['payload'];

export abstract class LegalIdentityOnRecord {
  abstract isProvided(): this is ProvidedLegalIdentity;

  abstract equals(other: LegalIdentityOnRecord): boolean;
}

// Held as the event recorded it: shreddable fields are not re-validated (ADR 0057).
export class ProvidedLegalIdentity implements LegalIdentityOnRecord {
  constructor(private readonly _recorded: Recorded) {
  }

  isProvided(): this is ProvidedLegalIdentity {
    return true;
  }

  // Field by field: jsonb keeps no key order.
  equals(other: LegalIdentityOnRecord): boolean {
    return other.isProvided()
      && (Object.keys(this._recorded) as (keyof Recorded)[]).every((field) => this._recorded[field] === other._recorded[field]);
  }
}

export class NoLegalIdentity implements LegalIdentityOnRecord {
  isProvided(): this is ProvidedLegalIdentity {
    return false;
  }

  equals(other: LegalIdentityOnRecord): boolean {
    return !other.isProvided();
  }
}
