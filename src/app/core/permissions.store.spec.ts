import { TestBed } from '@angular/core/testing';
import { AuthResponse } from './models';
import { PermissionsStore } from './permissions.store';
import { SessionStore } from './session.store';

describe('PermissionsStore', () => {
  let store: PermissionsStore;
  let session: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PermissionsStore);
    session = TestBed.inject(SessionStore);
  });

  it('grants customer checkout and profile permissions', () => {
    const response: AuthResponse = {
      accessToken: 'token',
      tokenType: 'Bearer',
      userId: 11,
      email: 'customer@test.com',
      role: 'CUSTOMER'
    };

    session.set(response);

    expect(store.can('checkout.use')).toBeTrue();
    expect(store.can('profile.manage')).toBeTrue();
    expect(store.can('admin.product.create')).toBeFalse();
  });

  it('grants admin-only permissions to admin role', () => {
    const response: AuthResponse = {
      accessToken: 'token',
      tokenType: 'Bearer',
      userId: 1,
      email: 'admin@test.com',
      role: 'ADMIN'
    };

    session.set(response);

    expect(store.can('admin.dashboard.view')).toBeTrue();
    expect(store.can('admin.audit.view')).toBeTrue();
    expect(store.can('admin.product.bulk')).toBeTrue();
  });

  it('applies and resets role permission overrides', () => {
    store.setRolePermissions('CUSTOMER', ['catalog.view', 'wishlist.use']);

    expect(store.getRolePermissions('CUSTOMER')).toEqual(['catalog.view', 'wishlist.use']);

    store.resetRolePermissions('CUSTOMER');

    expect(store.getRolePermissions('CUSTOMER')).toContain('checkout.use');
    expect(store.getRolePermissions('CUSTOMER')).toContain('profile.manage');
  });
});
