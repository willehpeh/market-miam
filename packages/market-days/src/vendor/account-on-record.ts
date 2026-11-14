// What the vendor's stream says of their sign-in account: a fact beside their lifecycle, as
// the legal identity is (ADR 0063).
export abstract class AccountOnRecord {
  abstract recordOpened(proceed: () => void): void;
  abstract recordClosed(proceed: () => void): void;
}

// Nothing recorded of the account yet: vendors from before invitations have an account all the same.
export class UnrecordedAccount extends AccountOnRecord {
  recordOpened(proceed: () => void): void {
    proceed();
  }

  recordClosed(proceed: () => void): void {
    proceed();
  }
}

export class OpenedAccount extends AccountOnRecord {
  recordOpened(): void {
    // Already recorded: the processor's retry records nothing.
  }

  recordClosed(proceed: () => void): void {
    proceed();
  }
}

export class ClosedAccount extends AccountOnRecord {
  recordOpened(): void {
    // Closed for good.
  }

  recordClosed(): void {
    // Already recorded: the processor's retry records nothing.
  }
}
