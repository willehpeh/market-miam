import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { MerchantEvent, PaymentAccountRegistrationFailed, PaymentAccountRegistrationStarted } from './events';
import { NoRegistration, OpenRegistration, PaymentAccountOnRecord } from './payment-account-on-record';

// The vendor as Ordering sees them: a merchant, who takes orders once they can take payments.
export class Merchant extends Aggregate {
  private _paymentAccount: PaymentAccountOnRecord = new NoRegistration();

  constructor(private readonly _id: VendorId) {
    super();
  }

  startPaymentAccountRegistration(registrationId: string, accountToken: string, startedAt: Instant) {
    this._paymentAccount.startRegistration(registrationId, () =>
      this.raise(this.registrationStarted(registrationId, accountToken, startedAt)),
    );
  }

  failPaymentAccountRegistration(registrationId: string, failedAt: Instant) {
    this.raise(this.registrationFailed(registrationId, failedAt));
  }

  apply(event: MerchantEvent): void {
    switch (event.type) {
      case 'PaymentAccountRegistrationStarted':
        this._paymentAccount = new OpenRegistration(event.payload.registrationId);
        break;
      case 'PaymentAccountRegistrationFailed':
        this._paymentAccount = new NoRegistration();
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

  private registrationFailed(registrationId: string, failedAt: Instant): PaymentAccountRegistrationFailed {
    return {
      type: 'PaymentAccountRegistrationFailed',
      payload: { vendorId: this._id.value(), registrationId, failedAt: failedAt.value() },
      version: 1,
    };
  }
}
