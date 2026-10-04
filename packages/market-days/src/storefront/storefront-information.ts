import { StorefrontInformationEdited } from './events';

type Recorded = StorefrontInformationEdited['payload'];

// What the storefront last said about itself.
export abstract class StorefrontInformation {
  abstract isProvided(): this is ProvidedStorefrontInformation;

  abstract equals(other: StorefrontInformation): boolean;
}

// Held as the event recorded it: shreddable fields are not re-validated (ADR 0057). After
// erasure they read back as the shredded sentinel, and a sentinel that failed a constructor
// would make an erased vendor's storefront impossible to load.
export class ProvidedStorefrontInformation implements StorefrontInformation {
  constructor(private readonly _recorded: Recorded) {
  }

  isProvided(): this is ProvidedStorefrontInformation {
    return true;
  }

  // Field by field: jsonb keeps no key order.
  equals(other: StorefrontInformation): boolean {
    return other.isProvided()
      && (Object.keys(this._recorded) as (keyof Recorded)[]).every((field) => this._recorded[field] === other._recorded[field]);
  }
}

export class NoStorefrontInformation implements StorefrontInformation {
  isProvided(): this is ProvidedStorefrontInformation {
    return false;
  }

  equals(other: StorefrontInformation): boolean {
    return !other.isProvided();
  }
}
