import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { CardPayments } from './card-payments';
import { ObservedAccount } from './observed-account';
import {
  MerchantEvent,
  PaymentAccountDisabled,
  PaymentAccountEnabled,
  PaymentAccountIssueDetected,
  PaymentAccountRegistrationConfirmed,
  PaymentAccountRegistrationFailed,
  PaymentAccountRegistrationStarted,
} from './events';
import { ConfirmedAccount, NoOpenRegistration, OpenRegistration, PaymentAccountOnRecord } from './payment-account-on-record';

export class Merchant extends Aggregate {
  private _paymentAccount: PaymentAccountOnRecord = new NoOpenRegistration();
  private readonly _registrationsMade = new Set<string>();
  private _currentAccountId?: string;
  private _issueOpen = false;

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

  observePaymentAccount(account: ObservedAccount, observedAt: Instant) {
    this.confirmRegistration(account, observedAt);
    if (account.accountId === this._currentAccountId) {
      this.recordCardPayments(account.cardPayments, observedAt);
      this.recordInformationDue(account.informationDueBy, observedAt);
    }
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
        this._currentAccountId = event.payload.accountId;
        this._paymentAccount = new ConfirmedAccount('inactive');
        break;
      case 'PaymentAccountEnabled':
        this._paymentAccount = new ConfirmedAccount('active');
        break;
      case 'PaymentAccountDisabled':
        this._paymentAccount = new ConfirmedAccount('inactive');
        break;
      case 'PaymentAccountIssueDetected':
        this._issueOpen = true;
        break;
    }
  }

  private confirmRegistration({ registrationId, accountId }: ObservedAccount, confirmedAt: Instant) {
    if (this._paymentAccount.isOpen(registrationId)) {
      this.raise(this.registrationConfirmed(registrationId, accountId, confirmedAt));
    }
  }

  private recordCardPayments(cardPayments: CardPayments, observedAt: Instant) {
    if (this._paymentAccount.cardPaymentsChangeTo(cardPayments)) {
      this.raise(cardPayments === 'active' ? this.accountEnabled(observedAt) : this.accountDisabled(observedAt));
    }
  }

  private recordInformationDue(informationDueBy: string | undefined, observedAt: Instant) {
    if (informationDueBy && this._paymentAccount.isEnabled() && !this._issueOpen) {
      this.raise(this.issueDetected(informationDueBy, observedAt));
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

  private accountDisabled(disabledAt: Instant): PaymentAccountDisabled {
    return {
      type: 'PaymentAccountDisabled',
      payload: { vendorId: this._id.value(), disabledAt: disabledAt.value() },
      version: 1,
    };
  }

  private issueDetected(informationDueBy: string, detectedAt: Instant): PaymentAccountIssueDetected {
    return {
      type: 'PaymentAccountIssueDetected',
      payload: { vendorId: this._id.value(), informationDueBy, detectedAt: detectedAt.value() },
      version: 1,
    };
  }
}
