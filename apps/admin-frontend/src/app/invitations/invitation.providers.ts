import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Invitations } from './invitations';
import { HttpInvitations } from './http.invitations';
import { invitationFeature } from './invitation.state';
import { InvitationEffects } from './invitation.effects';
import { InvitationFacade } from './invitation.facade';
import { StoreInvitationFacade } from './store.invitation.facade';

export function provideInvitations(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Invitations, useClass: HttpInvitations },
    provideState(invitationFeature),
    provideEffects(InvitationEffects),
    { provide: InvitationFacade, useClass: StoreInvitationFacade },
  ]);
}
