import { RegistrationAlreadyOpenError } from './registration-already-open.error';

// What the merchant's stream says of their payment account, as Market Days' Vendor holds its
// AccountOnRecord: each state answers for its own rule.
export abstract class PaymentAccountOnRecord {
  abstract startRegistration(registrationId: string, proceed: () => void): void;
  abstract failRegistration(proceed: () => void): void;
}

// No registration open: none started yet, or the last one failed.
export class NoRegistration extends PaymentAccountOnRecord {
  startRegistration(registrationId: string, proceed: () => void): void {
    proceed();
  }

  failRegistration(): void {
    // Nothing open to fail: the failure was recorded already.
  }
}

export class OpenRegistration extends PaymentAccountOnRecord {
  constructor(private readonly registrationId: string) {
    super();
  }

  startRegistration(registrationId: string): void {
    if (registrationId === this.registrationId) {
      // The same tap sent again: already started.
      return;
    }
    throw new RegistrationAlreadyOpenError();
  }

  failRegistration(proceed: () => void): void {
    proceed();
  }
}
