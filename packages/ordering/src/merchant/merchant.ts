import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { MerchantEvent, PaymentAccountRegistrationStarted } from './events';

// The vendor as Ordering sees them: a merchant, who takes orders once they can take payments.
export class Merchant extends Aggregate {
  private _openRegistration?: string;

  constructor(private readonly _id: VendorId) {
    super();
  }

  startPaymentAccountRegistration(registrationId: string, accountToken: string, startedAt: Instant) {
    if (registrationId === this._openRegistration) {
      // The same tap sent again: already started.
      return;
    }
    this.raise(this.registrationStarted(registrationId, accountToken, startedAt));
  }

  apply(event: MerchantEvent): void {
    switch (event.type) {
      case 'PaymentAccountRegistrationStarted':
        this._openRegistration = event.payload.registrationId;
        break;
    }
  }

  private registrationStarted(registrationId: string, accountToken: string, startedAt: Instant): PaymentAccountRegistrationStarted {
    return {
      type: 'PaymentAccountRegistrationStarted',
      payload: { vendorId: this._id.value(), registrationId, accountToken, startedAt: startedAt.value() },
      version: 1,
    };
  }
}
