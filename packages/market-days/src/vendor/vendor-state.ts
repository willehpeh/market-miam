import { VendorErasedError } from './vendor-erased.error';
import { VendorNotRegisteredError } from './vendor-not-registered.error';

// What a vendor makes of each command, by where they stand: carry it out (`proceed`), do
// nothing, or refuse. One class per state, so each row of ADRs 0060's and 0063's tables is in
// one place.
export abstract class VendorState {
  abstract invite(proceed: () => void): void;
  abstract register(proceed: () => void): void;
  abstract provideLegalIdentity(proceed: () => void): void;
  abstract erase(proceed: () => void): void;

  recordAccountClosed(proceed: () => void): void {
    proceed();
  }

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

  override isErased(): boolean {
    return true;
  }
}
