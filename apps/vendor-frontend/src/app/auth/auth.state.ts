import { createAction, createFeatureSelector, createReducer, createSelector, on, props } from '@ngrx/store';

const Login = createAction('[Auth] Login');
const LoginSuccess = createAction('[Auth] Login Success', props<{ userId: string }>());

export const authFeatureKey = 'auth';

export interface AuthState {
  loading: boolean;
  userId: string;
}

export const initialState: AuthState = {
  loading: false,
  userId: '',
};

export const authReducer = createReducer<AuthState>(
  initialState,
  on(Login, (state) => ({ ...state, isLoading: true })),
  on(LoginSuccess, (state, { userId }) => ({ ...state, isLoading: false, userId })),
);

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);
export const selectAuthUserId = createSelector(selectAuthState, (state) => state.userId);
export const selectAuthIsLoading = createSelector(selectAuthState, (state) => state.loading);
export const selectIsAuthenticated = createSelector(selectAuthUserId, (userId) => userId !== '');
