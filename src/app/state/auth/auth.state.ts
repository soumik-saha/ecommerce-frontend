import { createFeature, createReducer, on } from '@ngrx/store';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Role } from '../../core/models';

export interface AuthState {
  userId: number | null;
  email: string | null;
  role: Role | null;
  authenticated: boolean;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  role: null,
  authenticated: false
};

export const authActions = createActionGroup({
  source: 'Auth',
  events: {
    SessionRestored: props<{ userId: number; email: string; role: Role }>(),
    LoggedOut: emptyProps()
  }
});

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,
    on(authActions.sessionRestored, (_, { userId, email, role }) => ({ userId, email, role, authenticated: true })),
    on(authActions.loggedOut, () => initialState)
  )
});
