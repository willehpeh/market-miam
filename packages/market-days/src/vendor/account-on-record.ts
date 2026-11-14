// What the vendor's stream says of their sign-in account: a fact beside their lifecycle, as
// the legal identity is (ADR 0063).
export abstract class AccountOnRecord {
  abstract recordClosed(proceed: () => void): void;
}

// Nothing recorded of the account yet.
export class UnrecordedAccount extends AccountOnRecord {
  recordClosed(proceed: () => void): void {
    proceed();
  }
}

export class ClosedAccount extends AccountOnRecord {
  recordClosed(): void {
    // Already recorded: the processor's retry records nothing.
  }
}
