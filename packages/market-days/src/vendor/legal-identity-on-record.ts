import { VendorLegalIdentityRecorded } from './events';

type Recorded = VendorLegalIdentityRecorded['payload'];

export abstract class LegalIdentityOnRecord {
  abstract isRecorded(): this is RecordedLegalIdentity;

  abstract equals(other: LegalIdentityOnRecord): boolean;
}

// Held as the event recorded it: shreddable fields are not re-validated (ADR 0057).
export class RecordedLegalIdentity implements LegalIdentityOnRecord {
  constructor(private readonly _recorded: Recorded) {
  }

  isRecorded(): this is RecordedLegalIdentity {
    return true;
  }

  // Field by field: jsonb keeps no key order.
  equals(other: LegalIdentityOnRecord): boolean {
    return other.isRecorded()
      && (Object.keys(this._recorded) as (keyof Recorded)[]).every((field) => this._recorded[field] === other._recorded[field]);
  }
}

export class NoLegalIdentity implements LegalIdentityOnRecord {
  isRecorded(): this is RecordedLegalIdentity {
    return false;
  }

  equals(other: LegalIdentityOnRecord): boolean {
    return !other.isRecorded();
  }
}
