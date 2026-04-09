import { createActionGroup, createFeature, createReducer, emptyProps, on, props } from '@ngrx/store';
import { CartItem } from '../../core/models';

export interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
  lastSyncedAt: null
};

export const cartActions = createActionGroup({
  source: 'Cart',
  events: {
    RefreshRequested: emptyProps(),
    RefreshSucceeded: props<{ items: CartItem[] }>(),
    RefreshFailed: props<{ message: string }>()
  }
});

export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    initialState,
    on(cartActions.refreshRequested, (state) => ({ ...state, loading: true, error: null })),
    on(cartActions.refreshSucceeded, (state, { items }) => ({
      ...state,
      items,
      loading: false,
      error: null,
      lastSyncedAt: new Date().toISOString()
    })),
    on(cartActions.refreshFailed, (state, { message }) => ({ ...state, loading: false, error: message }))
  )
});
