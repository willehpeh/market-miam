import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export const InviteVendor = createAction('[Invitations] Invite Vendor', props<{ email: string }>());
export const InviteVendorSuccess = createAction('[Invitations] Invite Vendor Success', props<{ email: string }>());

export interface InvitationState {
  // The address the last accepted invitation went to: still true whatever is typed next.
  sentTo: string | null;
}

export const initialState: InvitationState = {
  sentTo: null,
};

export const invitationFeature = createFeature({
  name: 'invitation',
  reducer: createReducer<InvitationState>(
    initialState,
    on(InviteVendorSuccess, (state, { email }): InvitationState => ({ ...state, sentTo: email })),
  ),
});
