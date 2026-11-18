import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class PaymentAccountOnRecord {
  abstract startRegistration(registrationId: string, proceed: () => void): void;
  abstract isOpen(registrationId: string): boolean;
}

export class NoOpenRegistration extends PaymentAccountOnRecord {
  startRegistration(registrationId: string, proceed: () => void): void {
    proceed();
  }

  isOpen(): boolean {
    return false;
  }
}

export class OpenRegistration extends PaymentAccountOnRecord {
  constructor(private readonly registrationId: string) {
    super();
  }

  startRegistration(registrationId: string): void {
    if (!this.isOpen(registrationId)) {
      throw new RegistrationAlreadyOpenError();
    }
  }

  isOpen(registrationId: string): boolean {
    return registrationId === this.registrationId;
  }
}

export class ConfirmedAccount extends PaymentAccountOnRecord {
  constructor(private readonly registrationId: string) {
    super();
  }

  startRegistration(registrationId: string): void {
    if (registrationId !== this.registrationId) {
      throw new PaymentAccountAlreadyExistsError();
    }
  }

  isOpen(): boolean {
    return false;
  }
}
