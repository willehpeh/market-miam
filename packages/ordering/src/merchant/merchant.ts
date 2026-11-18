import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { CardPayments } from './card-payments';
import {
  MerchantEvent,
  PaymentAccountEnabled,
  PaymentAccountRegistrationConfirmed,
  PaymentAccountRegistrationFailed,
  PaymentAccountRegistrationStarted,
} from './events';
import {
  ConfirmedAccount,
  EnabledAccount,
  NoOpenRegistration,
  OpenRegistration,
  PaymentAccountOnRecord,
} from './payment-account-on-record';

export class Merchant extends Aggregate {
  private _paymentAccount: PaymentAccountOnRecord = new NoOpenRegistration();
  private readonly _registrationsMade = new Set<string>();

  constructor(private readonly _id: VendorId) {
    super();
  }

  startPaymentAccountRegistration(registrationId: string, accountToken: string, startedAt: Instant) {
    if (this._registrationsMade.has(registrationId)) {
      return;
    }
    this._paymentAccount.allowNewRegistration();
    this.raise(this.registrationStarted(registrationId, accountToken, startedAt));
  }

  failPaymentAccountRegistration(registrationId: string, failedAt: Instant) {
    if (this._paymentAccount.isOpen(registrationId)) {
      this.raise(this.registrationFailed(registrationId, failedAt));
    }
  }

  observePaymentAccount(registrationId: string, accountId: string, cardPayments: CardPayments, observedAt: Instant) {
    this.confirmRegistration(registrationId, accountId, observedAt);
    this.recordCardPayments(accountId, cardPayments, observedAt);
  }

  apply(event: MerchantEvent): void {
    switch (event.type) {
      case 'PaymentAccountRegistrationStarted':
        this._registrationsMade.add(event.payload.registrationId);
        this._paymentAccount = new OpenRegistration(event.payload.registrationId);
        break;
      case 'PaymentAccountRegistrationFailed':
        this._paymentAccount = new NoOpenRegistration();
        break;
      case 'PaymentAccountRegistrationConfirmed':
        this._paymentAccount = new ConfirmedAccount(event.payload.accountId);
        break;
      case 'PaymentAccountEnabled':
        this._paymentAccount = new EnabledAccount();
        break;
    }
  }

  private confirmRegistration(registrationId: string, accountId: string, confirmedAt: Instant) {
    if (this._paymentAccount.isOpen(registrationId)) {
      this.raise(this.registrationConfirmed(registrationId, accountId, confirmedAt));
    }
  }

  private recordCardPayments(accountId: string, cardPayments: CardPayments, observedAt: Instant) {
    if (this._paymentAccount.becomesEnabledBy(accountId, cardPayments)) {
      this.raise(this.accountEnabled(observedAt));
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

  private registrationConfirmed(
    registrationId: string,
    accountId: string,
    confirmedAt: Instant,
  ): PaymentAccountRegistrationConfirmed {
    return {
      type: 'PaymentAccountRegistrationConfirmed',
      payload: { vendorId: this._id.value(), registrationId, accountId, confirmedAt: confirmedAt.value() },
      version: 1,
    };
  }

  private accountEnabled(enabledAt: Instant): PaymentAccountEnabled {
    return {
      type: 'PaymentAccountEnabled',
      payload: { vendorId: this._id.value(), enabledAt: enabledAt.value() },
      version: 1,
    };
  }
}
