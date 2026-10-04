import { Aggregate } from '@market-miam/event-sourcing';
import { VendorId } from '@market-miam/shared-kernel';
import { Email, Instant } from '@market-miam/common';
import { VendorEvent, VendorLegalIdentityProvided, VendorRegistered } from './events';
import { VendorStatus } from './vendor-status';
import { LegalIdentity } from './legal-identity';
import { LegalIdentityOnRecord, NoLegalIdentity, ProvidedLegalIdentity } from './legal-identity-on-record';
import { VendorNotRegisteredError } from './vendor-not-registered.error';

export class Vendor extends Aggregate {

  private _status = VendorStatus.unregistered();
  private _legalIdentity: LegalIdentityOnRecord = new NoLegalIdentity();

  constructor(private readonly _id: VendorId) {
    super();
  }

  register(registeredAt: Instant, email: Email) {
    if (this.alreadyRegistered()) {
      return;
    }
    const event: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: this._id.value(),
        registeredAt: registeredAt.value(),
        email: email.value()
      },
      version: 1
    };
    this.raise(event);
  }

  provideLegalIdentity(identity: LegalIdentity) {
    if (!this.alreadyRegistered()) {
      throw new VendorNotRegisteredError();
    }
    const payload = identity.providedBy(this._id.value());
    if (this._legalIdentity.equals(new ProvidedLegalIdentity(payload))) {
      return;
    }
    const event: VendorLegalIdentityProvided = {
      type: 'VendorLegalIdentityProvided',
      payload,
      version: 1
    };
    this.raise(event);
  }

  private alreadyRegistered() {
    return this._status.isRegistered();
  }

  apply(event: VendorEvent): void {
    switch (event.type) {
      case 'VendorRegistered':
        this._status = VendorStatus.registered();
        break;
      case 'VendorLegalIdentityProvided':
        this._legalIdentity = new ProvidedLegalIdentity(event.payload);
        break;
    }
  }
}
