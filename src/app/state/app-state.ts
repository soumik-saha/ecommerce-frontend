import { AuthState } from './auth/auth.state';
import { CartState } from './cart/cart.state';
import { CatalogState } from './catalog/catalog.state';
import { ProfileState } from './profile/profile.state';
import { AdminState } from './admin/admin.state';

export interface AppState {
  auth: AuthState;
  cart: CartState;
  catalog: CatalogState;
  profile: ProfileState;
  admin: AdminState;
}
