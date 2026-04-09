import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createActionGroup, createFeature, createReducer, emptyProps, on, props } from '@ngrx/store';
import { Order, Product, User } from '../../core/models';

export interface AdminState {
  products: EntityState<Product>;
  users: EntityState<User>;
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const productAdapter = createEntityAdapter<Product>({ selectId: (product) => product.id });
const userAdapter = createEntityAdapter<User>({ selectId: (user) => user.id });

const initialState: AdminState = {
  products: productAdapter.getInitialState(),
  users: userAdapter.getInitialState(),
  orders: [],
  loading: false,
  error: null
};

export const adminActions = createActionGroup({
  source: 'Admin',
  events: {
    DashboardRequested: emptyProps(),
    DashboardSucceeded: props<{ products: Product[]; users: User[]; orders: Order[] }>(),
    DashboardFailed: props<{ message: string }>()
  }
});

export const adminFeature = createFeature({
  name: 'admin',
  reducer: createReducer(
    initialState,
    on(adminActions.dashboardRequested, (state) => ({ ...state, loading: true, error: null })),
    on(adminActions.dashboardSucceeded, (state, { products, users, orders }) => ({
      ...state,
      loading: false,
      error: null,
      products: productAdapter.setAll(products, state.products),
      users: userAdapter.setAll(users, state.users),
      orders
    })),
    on(adminActions.dashboardFailed, (state, { message }) => ({ ...state, loading: false, error: message }))
  )
});
