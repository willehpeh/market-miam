import { Signal } from '@angular/core';

export abstract class InvitationFacade {
  abstract readonly sending: Signal<boolean>;
  abstract readonly sentTo: Signal<string | null>;

  abstract invite(email: string): void;
}
