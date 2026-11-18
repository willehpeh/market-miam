import { PaymentAccountAlreadyExistsError } from './payment-account-already-exists.error';
import { RegistrationAlreadyOpenError } from './registration-already-open.error';

export abstract class PaymentAccountOnRecord {
  abstract startNewRegistration(start: () => void): void;
  abstract isOpen(registrationId: string): boolean;
}

export class NoOpenRegistration extends PaymentAccountOnRecord {
  startNewRegistration(start: () => void): void {
    start();
  }

  isOpen(): boolean {
    return false;
  }
}

export class OpenRegistration extends PaymentAccountOnRecord {
  constructor(private readonly registrationId: string) {
    super();
  }

  startNewRegistration(): void {
    throw new RegistrationAlreadyOpenError();
  }

  isOpen(registrationId: string): boolean {
    return registrationId === this.registrationId;
  }
}

export class ConfirmedAccount extends PaymentAccountOnRecord {
  startNewRegistration(): void {
    throw new PaymentAccountAlreadyExistsError();
  }

  isOpen(): boolean {
    return false;
  }
}
