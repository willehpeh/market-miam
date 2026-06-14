import { Aggregate } from '@market-monster/event-sourcing';
import { VendorId } from '@market-monster/shared-kernel';
import { Email, Instant } from '@market-monster/common';
import { VendorEvent, VendorRegistered } from './events';

export class Vendor extends Aggregate {

  register(vendorId: VendorId, registeredAt: Instant, email: Email) {
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

  apply(event: VendorEvent): void {
    switch (event.type) {
      case 'VendorRegistered':
        // Vendor carries no rehydrated state until idempotency is introduced.
        break;
    }
  }
}