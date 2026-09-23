import { Aggregate } from '@market-miam/event-sourcing';
import { VendorId } from '@market-miam/shared-kernel';
import { Email, Instant } from '@market-miam/common';
import { VendorEvent, VendorLegalIdentityRecorded, VendorRegistered } from './events';
import { VendorStatus } from './vendor-status';
import { LegalIdentity } from './legal-identity';
import { VendorNotRegisteredError } from './vendor-not-registered.error';

export class Vendor extends Aggregate {

  private _status = VendorStatus.unregistered();
  private _legalIdentity?: VendorLegalIdentityRecorded['payload'];

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

  recordLegalIdentity(identity: LegalIdentity) {
    if (!this.alreadyRegistered()) {
      throw new VendorNotRegisteredError();
    }
    if (this._legalIdentity && identity.sameAs(this._legalIdentity)) {
      return;
    }
    const event: VendorLegalIdentityRecorded = {
      type: 'VendorLegalIdentityRecorded',
      payload: identity.recordedFor(this._id.value()),
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
      case 'VendorLegalIdentityRecorded':
        this._legalIdentity = event.payload;
        break;
    }
  }
}
