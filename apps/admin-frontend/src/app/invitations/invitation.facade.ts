import { Signal } from '@angular/core';
import { InvitationRefusal } from './invitations';

export abstract class InvitationFacade {
  abstract readonly sending: Signal<boolean>;
  abstract readonly refusal: Signal<InvitationRefusal | null>;
  abstract readonly sentTo: Signal<string | null>;

  abstract invite(email: string): void;
}
