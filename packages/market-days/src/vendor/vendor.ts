import { Aggregate } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';
import { Email, Instant } from '@market-monster/common';
import { VendorEvent, VendorRegistered } from './events';

export class Vendor extends Aggregate {

  private _registeredAt: Instant | null = null;

  constructor(private readonly _id: VendorId) {
    super();
  }

  register(vendorId: VendorId, registeredAt: Instant, email: Email) {
    if (this.alreadyRegistered()) {
      return;
    }
    const event: VendorRegistered = {
      type: 'VendorRegistered',
      payload: {
        vendorId: vendorId.value(),
        registeredAt: registeredAt.value(),
        email: email.value()
      }
    };
    this.raise(event);
  }

  private alreadyRegistered() {
    return this._registeredAt !== null;
  }

  apply(event: VendorEvent): void {
    switch (event.type) {
      case 'VendorRegistered':
        this._registeredAt = new Instant(event.payload.registeredAt);
        break;
    }
  }
}
