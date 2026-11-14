import { Observable } from 'rxjs';

// The api refusing the address itself.
export type AddressRefusal = 'email-in-use' | 'invalid-email';

// What the api answers to an invitation: sent, with the vendorId it minted, or refused.
export type InvitationAnswer = { vendorId: string } | { refusal: AddressRefusal };

// Why an invitation didn't go: the api refused the address, or it couldn't be sent at all.
export type InvitationRefusal = AddressRefusal | 'not-sent';

// Inviting a vendor through the operator API (ADR 0060).
export abstract class Invitations {
  abstract send(email: string): Observable<InvitationAnswer>;
}
