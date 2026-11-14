import { VendorErasedError } from './vendor-erased.error';
import { VendorNotErasedError } from './vendor-not-erased.error';
import { VendorNotInvitedError } from './vendor-not-invited.error';
import { VendorNotRegisteredError } from './vendor-not-registered.error';

// What a vendor makes of each command, by where they stand: carry it out (`proceed`), do
// nothing, or refuse. One class per state, so each row of ADRs 0060's and 0063's tables is in
// one place.
export abstract class VendorState {
  abstract invite(proceed: () => void): void;
  abstract register(proceed: () => void): void;
  abstract provideLegalIdentity(proceed: () => void): void;
  abstract erase(proceed: () => void): void;
  abstract recordAccountOpened(proceed: () => void): void;
  abstract recordAccountClosed(proceed: () => void): void;

  isErased(): boolean {
    return false;
  }
}

// Nothing on the stream yet.
export class UnknownVendor extends VendorState {
  invite(proceed: () => void): void {
    proceed();
  }

  // Vendors from before invitations registered without one.
  register(proceed: () => void): void {
    proceed();
  }

  provideLegalIdentity(): void {
    throw new VendorNotRegisteredError();
  }

  erase(): void {
    throw new VendorNotRegisteredError();
  }

  recordAccountOpened(): void {
    throw new VendorNotInvitedError();
  }

  recordAccountClosed(): void {
    throw new VendorNotErasedError();
  }
}

// Invited by an operator, and not signed in yet.
export class InvitedVendor extends VendorState {
  invite(): void {
    // Already invited.
  }

  // The vendor taking up the invitation at first sign-in.
  register(proceed: () => void): void {
    proceed();
  }

  provideLegalIdentity(): void {
    throw new VendorNotRegisteredError();
  }

  erase(proceed: () => void): void {
    proceed();
  }

  recordAccountOpened(proceed: () => void): void {
    proceed();
  }

  recordAccountClosed(): void {
    throw new VendorNotErasedError();
  }
}

export class RegisteredVendor extends VendorState {
  invite(): void {
    // Already a vendor.
  }

  register(): void {
    // Registration is idempotent: the first one stands.
  }

  provideLegalIdentity(proceed: () => void): void {
    proceed();
  }

  erase(proceed: () => void): void {
    proceed();
  }

  // The vendor signed in before the processor recorded the opening, or registered before
  // invitations, with an account all the same.
  recordAccountOpened(proceed: () => void): void {
    proceed();
  }

  // Only erasure closes an account (ADR 0063).
  recordAccountClosed(): void {
    throw new VendorNotErasedError();
  }
}

// Erasure is final (ADR 0058).
export class ErasedVendor extends VendorState {
  invite(): void {
    throw new VendorErasedError();
  }

  register(): void {
    throw new VendorErasedError();
  }

  provideLegalIdentity(): void {
    throw new VendorErasedError();
  }

  erase(): void {
    // Already erased: an erasure can be run again.
  }

  recordAccountOpened(): void {
    // Closing is under way, and finds the account by vendorId (ADR 0063).
  }

  // The one command an erased vendor carries out: its event carries no personal data (ADR 0063).
  recordAccountClosed(proceed: () => void): void {
    proceed();
  }

  override isErased(): boolean {
    return true;
  }
}
