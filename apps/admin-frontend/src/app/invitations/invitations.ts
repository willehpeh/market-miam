import { Observable } from 'rxjs';

// What the api answers to an invitation, in the operator's terms.
export type InvitationOutcome = 'sent' | 'email-in-use' | 'invalid-email';
// Why an invitation didn't go: the api refused the address, or it couldn't be sent at all.
export type InvitationRefusal = Exclude<InvitationOutcome, 'sent'> | 'not-sent';

// Inviting a vendor through the operator API (ADR 0060).
export abstract class Invitations {
  abstract send(email: string): Observable<InvitationOutcome>;
}
