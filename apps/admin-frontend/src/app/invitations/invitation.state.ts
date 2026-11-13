import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { InvitationRefusal } from './invitations';

export const InviteVendor = createAction('[Invitations] Invite Vendor', props<{ email: string }>());
export const InviteVendorSuccess = createAction('[Invitations] Invite Vendor Success', props<{ email: string }>());
export const InviteVendorRefused = createAction('[Invitations] Invite Vendor Refused', props<{ refusal: InvitationRefusal }>());

export interface InvitationState {
  sending: boolean;
  // Why the last invitation was refused, for the address still in the field.
  refusal: InvitationRefusal | null;
  // The address the last accepted invitation went to: still true whatever is typed next.
  sentTo: string | null;
}

export const initialState: InvitationState = {
  sending: false,
  refusal: null,
  sentTo: null,
};

export const invitationFeature = createFeature({
  name: 'invitation',
  reducer: createReducer<InvitationState>(
    initialState,
    on(InviteVendor, (state): InvitationState => ({ ...state, sending: true, refusal: null })),
    on(InviteVendorSuccess, (state, { email }): InvitationState => ({ ...state, sending: false, sentTo: email })),
    on(InviteVendorRefused, (state, { refusal }): InvitationState => ({ ...state, sending: false, refusal })),
  ),
});
