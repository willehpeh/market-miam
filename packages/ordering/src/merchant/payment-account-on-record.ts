import { CardPayments } from './card-payments';
import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class PaymentAccountOnRecord {
  abstract allowNewRegistration(): void;
  abstract isOpen(registrationId: string): boolean;
  abstract becomesEnabledBy(cardPayments: CardPayments): boolean;
  abstract becomesDisabledBy(cardPayments: CardPayments): boolean;
}

abstract class NoAccountYet extends PaymentAccountOnRecord {
  override becomesEnabledBy(): boolean {
    return false;
  }

  override becomesDisabledBy(): boolean {
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

abstract class ExistingAccount extends PaymentAccountOnRecord {
  override allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  override isOpen(): boolean {
    return false;
  }
}

export class ConfirmedAccount extends ExistingAccount {
  override becomesEnabledBy(cardPayments: CardPayments): boolean {
    return cardPayments === 'active';
  }

  override becomesDisabledBy(): boolean {
    return false;
  }
}

export class EnabledAccount extends ExistingAccount {
  override becomesEnabledBy(): boolean {
    return false;
  }

  override becomesDisabledBy(cardPayments: CardPayments): boolean {
    return cardPayments === 'inactive';
  }
}
