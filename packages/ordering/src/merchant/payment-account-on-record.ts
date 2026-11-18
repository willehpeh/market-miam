import { CardPayments } from './card-payments';
import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class PaymentAccountOnRecord {
  abstract allowNewRegistration(): void;
  abstract isOpen(registrationId: string): boolean;
  abstract becomesEnabledBy(cardPayments: CardPayments): boolean;
}

export class NoOpenRegistration extends PaymentAccountOnRecord {
  override allowNewRegistration(): void {}

  override isOpen(): boolean {
    return false;
  }
  override becomesEnabledBy(): boolean {
    return false;
  }
}

export class OpenRegistration extends PaymentAccountOnRecord {
  constructor(private readonly registrationId: string) {
    super();
  }

  override allowNewRegistration(): void {
    throw new RegistrationAlreadyOpenError();
  }

  override isOpen(registrationId: string): boolean {
    return registrationId === this.registrationId;
  }
  override becomesEnabledBy(): boolean {
    return false;
  }
}

export class ConfirmedAccount extends PaymentAccountOnRecord {
  override allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  override isOpen(): boolean {
    return false;
  }

  override becomesEnabledBy(cardPayments: CardPayments): boolean {
    return cardPayments === 'active';
  }
}

export class EnabledAccount extends PaymentAccountOnRecord {
  override allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  override isOpen(): boolean {
    return false;
  }

  override becomesEnabledBy(): boolean {
    return false;
  }
}
