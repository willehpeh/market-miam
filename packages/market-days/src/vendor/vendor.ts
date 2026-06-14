import { Aggregate } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';
import { Email, Instant } from '@market-monster/common';
import { VendorEvent, VendorRegistered } from './events';
import { VendorStatus } from './vendor-status';

export class Vendor extends Aggregate {

  private _status = VendorStatus.unregistered();

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
      }
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
    }
  }
}
