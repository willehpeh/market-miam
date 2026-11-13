import { Observable } from 'rxjs';

// What became of an invitation, in the operator's terms.
export type InvitationOutcome = 'sent' | 'email-in-use' | 'invalid-email';
export type InvitationRefusal = Exclude<InvitationOutcome, 'sent'>;

// Inviting a vendor through the operator API (ADR 0060).
export abstract class Invitations {
  abstract send(email: string): Observable<InvitationOutcome>;
}
