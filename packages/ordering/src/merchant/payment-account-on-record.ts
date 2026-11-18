import { CardPayments } from './card-payments';
import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class PaymentAccountOnRecord {
  abstract allowNewRegistration(): void;
  abstract isOpen(registrationId: string): boolean;
  abstract cardPaymentsChangeTo(cardPayments: CardPayments): boolean;
  abstract isEnabled(): boolean;
}

abstract class NoAccountYet extends PaymentAccountOnRecord {
  override cardPaymentsChangeTo(): boolean {
    return false;
  }

  override isEnabled(): boolean {
    return false;
  }
}

export class NoOpenRegistration extends NoAccountYet {
  override allowNewRegistration(): void {}

  override isOpen(): boolean {
    return false;
  }
}

export class OpenRegistration extends NoAccountYet {
  constructor(private readonly registrationId: string) {
    super();
  }

  override allowNewRegistration(): void {
    throw new RegistrationAlreadyOpenError();
  }

  override isOpen(registrationId: string): boolean {
    return registrationId === this.registrationId;
  }
}

export class ConfirmedAccount extends PaymentAccountOnRecord {
  constructor(private readonly cardPayments: CardPayments) {
    super();
  }

  override allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  override isOpen(): boolean {
    return false;
  }

  override cardPaymentsChangeTo(cardPayments: CardPayments): boolean {
    return cardPayments !== this.cardPayments;
  }

  override isEnabled(): boolean {
    return this.cardPayments === 'active';
  }
}
