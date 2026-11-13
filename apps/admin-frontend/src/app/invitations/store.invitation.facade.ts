import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { InvitationFacade } from './invitation.facade';
import { invitationFeature, InviteVendor } from './invitation.state';

@Injectable()
export class StoreInvitationFacade implements InvitationFacade {
  private readonly store = inject(Store);

  readonly sending = this.store.selectSignal(invitationFeature.selectSending);
  readonly refusal = this.store.selectSignal(invitationFeature.selectRefusal);
  readonly sentTo = this.store.selectSignal(invitationFeature.selectSentTo);

  invite(email: string): void {
    this.store.dispatch(InviteVendor({ email }));
  }
}
