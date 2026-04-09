import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./features/home/home.page').then(m => m.HomePage), title: 'Home' },
  { path: 'products', loadComponent: () => import('./features/products.page').then(m => m.ProductsPage), title: 'Products' },
  { path: 'product/:id', loadComponent: () => import('./features/product-detail.page').then(m => m.ProductDetailPage), title: 'Product Details' },

  { path: 'cart', canActivate: [authGuard], loadComponent: () => import('./features/cart.page').then(m => m.CartPage), title: 'Cart' },
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./features/checkout.page').then(m => m.CheckoutPage), title: 'Checkout' },
  { path: 'wishlist', canActivate: [authGuard], loadComponent: () => import('./features/wishlist.page').then(m => m.WishlistPage), title: 'Wishlist' },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders.page').then(m => m.OrdersPage), title: 'Orders' },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./features/profile.page').then(m => m.ProfilePage), title: 'Profile' },

  { path: 'login', loadComponent: () => import('./features/login.page').then(m => m.LoginPage), title: 'Sign In' },
  { path: 'register', loadComponent: () => import('./features/register.page').then(m => m.RegisterPage), title: 'Register' },

  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin.page').then(m => m.AdminPage), title: 'Admin' },
  { path: 'admin/audit', canActivate: [adminGuard], loadComponent: () => import('./features/audit-log.page').then(m => m.AuditLogPage), title: 'Audit Log' },
  { path: '**', redirectTo: 'home' }
];