import { PhoneNumber } from '@market-miam/common';
import { StorefrontName } from './storefront-name';
import { StorefrontDescription } from './storefront-description';

// What the storefront last said about itself, kept as the event said it. The fields are
// held raw rather than as value objects because rehydration must never validate history
// (ADR 0039): after erasure these read back as the shredded sentinel, and a sentinel that
// failed a constructor would make an erased vendor's storefront impossible to load.
export class StorefrontInformation {
  constructor(private readonly _snapshot: { name: string; description: string; phone: string }) {
  }

  sameAs(name: StorefrontName, description: StorefrontDescription, phone: PhoneNumber): boolean {
    return this._snapshot.name === name.value()
      && this._snapshot.description === description.value()
      && this._snapshot.phone === phone.value();
  }
}
