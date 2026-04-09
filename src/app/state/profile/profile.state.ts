import { createActionGroup, createFeature, createReducer, emptyProps, on, props } from '@ngrx/store';
import { Address, Order } from '../../core/models';

export interface ProfileState {
  orders: Order[];
  addresses: Address[];
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  orders: [],
  addresses: [],
  loading: false,
  error: null
};

export const profileActions = createActionGroup({
  source: 'Profile',
  events: {
    LoadRequested: emptyProps(),
    LoadSucceeded: props<{ orders: Order[]; addresses: Address[] }>(),
    LoadFailed: props<{ message: string }>()
  }
});

export const profileFeature = createFeature({
  name: 'profile',
  reducer: createReducer(
    initialState,
    on(profileActions.LoadRequested, (state) => ({ ...state, loading: true, error: null })),
    on(profileActions.LoadSucceeded, (_, { orders, addresses }) => ({ orders, addresses, loading: false, error: null })),
    on(profileActions.LoadFailed, (state, { message }) => ({ ...state, loading: false, error: message }))
  )
});
