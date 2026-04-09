import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./features/home/feature/home-page.component').then(m => m.EnterpriseHomePageComponent), title: 'Home' },
  { path: 'products', loadComponent: () => import('./features/catalog/feature/catalog-page.component').then(m => m.CatalogPageComponent), title: 'Products' },
  { path: 'product/:id', loadComponent: () => import('./features/product-detail/feature/product-detail-page.component').then(m => m.EnterpriseProductDetailPageComponent), title: 'Product Details' },

  { path: 'cart', canActivate: [authGuard], loadComponent: () => import('./features/cart/feature/cart-page.component').then(m => m.EnterpriseCartPageComponent), title: 'Cart' },
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./features/checkout/feature/checkout-page.component').then(m => m.EnterpriseCheckoutPageComponent), title: 'Checkout' },
  { path: 'wishlist', canActivate: [authGuard], loadComponent: () => import('./features/wishlist.page').then(m => m.WishlistPage), title: 'Wishlist' },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders.page').then(m => m.OrdersPage), title: 'Orders' },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile/feature/profile-page.component').then(m => m.EnterpriseProfilePageComponent), title: 'Profile' },

  { path: 'login', loadComponent: () => import('./features/login.page').then(m => m.LoginPage), title: 'Sign In' },
  { path: 'register', loadComponent: () => import('./features/register.page').then(m => m.RegisterPage), title: 'Register' },

  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/feature/admin-page.component').then(m => m.EnterpriseAdminPageComponent), title: 'Admin' },
  { path: 'admin/audit', canActivate: [adminGuard], loadComponent: () => import('./features/audit-log.page').then(m => m.AuditLogPage), title: 'Audit Log' },
  { path: '**', redirectTo: 'home' }
];
