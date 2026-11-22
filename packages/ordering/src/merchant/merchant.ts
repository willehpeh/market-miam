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
  PaymentAccountIssueResolved,
  PaymentAccountRegistrationConfirmed,
  PaymentAccountRegistrationFailed,
  PaymentAccountRegistrationStarted,
} from './events';
import { CurrentAccount } from './current-account';
import { ConfirmedRegistration, NoOpenRegistration, OpenRegistration, RegistrationOnRecord } from './registration-on-record';

export class Merchant extends Aggregate {
  private _registration: RegistrationOnRecord = new NoOpenRegistration();
  private readonly _registrationsMade = new Set<string>();
  private _currentAccount?: CurrentAccount;

  constructor(private readonly _id: VendorId) {
    super();
  }

  startPaymentAccountRegistration(registrationId: string, accountToken: string, startedAt: Instant) {
    if (this._registrationsMade.has(registrationId)) {
      return;
    }
    this._registration.allowNewRegistration();
    this.raise(this.registrationStarted(registrationId, accountToken, startedAt));
  }

  isPaidThrough(accountId: string): boolean {
    return this._currentAccount?.is(accountId) ?? false;
  }

  failPaymentAccountRegistration(registrationId: string, failedAt: Instant) {
    if (this._registration.isOpen(registrationId)) {
      this.raise(this.registrationFailed(registrationId, failedAt));
    }
  }

  observePaymentAccount(account: ObservedAccount, observedAt: Instant) {
    this.confirmRegistration(account, observedAt);
    if (this._currentAccount?.is(account.accountId)) {
      this.recordCardPayments(this._currentAccount, account.cardPayments, observedAt);
      this.recordInformationDue(this._currentAccount, account.informationDueBy, observedAt);
    }
  }

  apply(event: MerchantEvent): void {
    switch (event.type) {
      case 'PaymentAccountRegistrationStarted':
        this._registrationsMade.add(event.payload.registrationId);
        this._registration = new OpenRegistration(event.payload.registrationId);
        break;
      case 'PaymentAccountRegistrationFailed':
        this._registration = new NoOpenRegistration();
        break;
      case 'PaymentAccountRegistrationConfirmed':
        this._registration = new ConfirmedRegistration();
        this._currentAccount = new CurrentAccount(event.payload.accountId);
        break;
      case 'PaymentAccountEnabled':
        this._currentAccount?.enable();
        break;
      case 'PaymentAccountDisabled':
        this._currentAccount?.disable();
        break;
      case 'PaymentAccountIssueDetected':
        this._currentAccount?.openIssue();
        break;
      case 'PaymentAccountIssueResolved':
        this._currentAccount?.resolveIssue();
        break;
    }
  }

  private confirmRegistration({ registrationId, accountId }: ObservedAccount, confirmedAt: Instant) {
    if (this._registration.isOpen(registrationId)) {
      this.raise(this.registrationConfirmed(registrationId, accountId, confirmedAt));
    }
  }

  private recordCardPayments(account: CurrentAccount, cardPayments: CardPayments, observedAt: Instant) {
    if (account.cardPaymentsChangeTo(cardPayments)) {
      this.raise(cardPayments === 'active' ? this.accountEnabled(observedAt) : this.accountDisabled(observedAt));
    }
  }

  private recordInformationDue(account: CurrentAccount, informationDueBy: string | undefined, observedAt: Instant) {
    if (account.issueChangesWith(informationDueBy)) {
      this.raise(informationDueBy ? this.issueDetected(informationDueBy, observedAt) : this.issueResolved(observedAt));
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

  private issueResolved(resolvedAt: Instant): PaymentAccountIssueResolved {
    return {
      type: 'PaymentAccountIssueResolved',
      payload: { vendorId: this._id.value(), resolvedAt: resolvedAt.value() },
      version: 1,
    };
  }
}
