import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (store.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
export const adminGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (!store.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (!store.isAdmin()) {
    return router.createUrlTree(['/products']);
  }
  return true;
};
