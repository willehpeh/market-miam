import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { PaymentAccountRegistrationStarted } from './events';

// The vendor as Ordering sees them: a merchant, who takes orders once they can take payments.
export class Merchant extends Aggregate {
  constructor(private readonly _id: VendorId) {
    super();
  }

  startPaymentAccountRegistration(registrationId: string, accountToken: string, startedAt: Instant) {
    this.raise(this.registrationStarted(registrationId, accountToken, startedAt));
  }

  apply(): void {
    // Nothing to fold yet: no rule reads what was recorded.
  }

  private registrationStarted(registrationId: string, accountToken: string, startedAt: Instant): PaymentAccountRegistrationStarted {
    return {
      type: 'PaymentAccountRegistrationStarted',
      payload: { vendorId: this._id.value(), registrationId, accountToken, startedAt: startedAt.value() },
      version: 1,
    };
  }
}
