import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class RegistrationOnRecord {
  abstract allowNewRegistration(): void;
  abstract isOpen(registrationId: string): boolean;
}

export class NoOpenRegistration extends RegistrationOnRecord {
  override allowNewRegistration(): void {}

  override isOpen(): boolean {
    return false;
  }
}

export class OpenRegistration extends RegistrationOnRecord {
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

export class ConfirmedRegistration extends RegistrationOnRecord {
  override allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  override isOpen(): boolean {
    return false;
  }
}
