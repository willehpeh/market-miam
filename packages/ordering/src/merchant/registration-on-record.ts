import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export interface RegistrationOnRecord {
  allowNewRegistration(): void;
  isOpen(registrationId: string): boolean;
}

export class NoOpenRegistration implements RegistrationOnRecord {
  allowNewRegistration(): void {}

  isOpen(): boolean {
    return false;
  }
}

export class OpenRegistration implements RegistrationOnRecord {
  constructor(private readonly registrationId: string) {}

  allowNewRegistration(): void {
    throw new RegistrationAlreadyOpenError();
  }

  isOpen(registrationId: string): boolean {
    return registrationId === this.registrationId;
  }
}

export class ConfirmedRegistration implements RegistrationOnRecord {
  allowNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  isOpen(): boolean {
    return false;
  }
}
