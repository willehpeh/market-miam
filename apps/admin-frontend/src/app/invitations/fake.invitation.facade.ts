import { Injectable, signal } from '@angular/core';
import { InvitationFacade } from './invitation.facade';
import { InvitationRefusal } from './invitations';

@Injectable()
export class FakeInvitationFacade implements InvitationFacade {
  readonly sending = signal(false);
  readonly refusal = signal<InvitationRefusal | null>(null);
  readonly sentTo = signal<string | null>(null);
  readonly invited: string[] = [];

  invite(email: string): void {
    this.invited.push(email);
  }
}
