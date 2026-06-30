import { createAction, createFeature, createReducer, createSelector, on, props } from '@ngrx/store';

export const Login = createAction('[Auth] Login');
export const Logout = createAction('[Auth] Logout');
export const AuthLoadingChanged = createAction('[Auth] Loading Changed', props<{ isLoading: boolean }>());
export const LoginSuccess = createAction('[Auth] Login Success', props<{ userId: string }>());
export const LogoutSuccess = createAction('[Auth] Logout Success');

export interface AuthState {
  isLoading: boolean;
  userId: string | null;
}

export const initialState: AuthState = {
  isLoading: true,
  userId: null,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer<AuthState>(
    initialState,
    on(AuthLoadingChanged, (state, { isLoading }) => ({ ...state, isLoading })),
    on(LoginSuccess, (state, { userId }) => ({ ...state, userId })),
    on(LogoutSuccess, (state) => ({ ...state, userId: null })),
  ),
});

export type AuthStatus = 'pending' | 'authenticated' | 'anonymous';

export const selectAuthStatus = createSelector(
  authFeature.selectIsLoading,
  authFeature.selectUserId,
  (isLoading, userId): AuthStatus =>
    isLoading ? 'pending' : userId !== null ? 'authenticated' : 'anonymous',
);
