import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';

export const ErrorRaised = createAction('[Notifications] Error Raised', props<{ message: string }>());
export const ErrorDismissed = createAction('[Notifications] Error Dismissed');

export interface NotificationsState {
  message: string | undefined;
}

export const initialState: NotificationsState = {
  message: undefined,
};

export const notificationsFeature = createFeature({
  name: 'notifications',
  reducer: createReducer<NotificationsState>(
    initialState,
    on(ErrorRaised, (_state, { message }): NotificationsState => ({ message })),
    on(ErrorDismissed, (): NotificationsState => ({ message: undefined })),
  ),
});
