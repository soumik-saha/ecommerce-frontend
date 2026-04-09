import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Role } from './models';
import { SessionStore } from './session.store';

export type AppPermission =
  | 'catalog.view'
  | 'checkout.use'
  | 'wishlist.use'
  | 'profile.manage'
  | 'orders.view'
  | 'admin.dashboard.view'
  | 'admin.product.create'
  | 'admin.product.edit'
  | 'admin.product.delete'
  | 'admin.product.bulk'
  | 'admin.user.create'
  | 'admin.export.csv'
  | 'admin.audit.view';

const KEY = 'ecom.permission.overrides';
const HISTORY_KEY = 'ecom.permission.history';

const DEFAULT_PERMISSION_MATRIX: Record<Role, AppPermission[]> = {
  CUSTOMER: ['catalog.view', 'checkout.use', 'wishlist.use', 'profile.manage', 'orders.view'],
  ADMIN: [
    'catalog.view',
    'checkout.use',
    'wishlist.use',
    'profile.manage',
    'orders.view',
    'admin.dashboard.view',
    'admin.product.create',
    'admin.product.edit',
    'admin.product.delete',
    'admin.product.bulk',
    'admin.user.create',
    'admin.export.csv',
    'admin.audit.view'
  ]
};

const ALL_PERMISSIONS: AppPermission[] = [
  'catalog.view',
  'checkout.use',
  'wishlist.use',
  'profile.manage',
  'orders.view',
  'admin.dashboard.view',
  'admin.product.create',
  'admin.product.edit',
  'admin.product.delete',
  'admin.product.bulk',
  'admin.user.create',
  'admin.export.csv',
  'admin.audit.view'
];

export interface PermissionVersion {
  id: string;
  timestamp: string;
  reason: string;
  matrix: Partial<Record<Role, AppPermission[]>>;
}

export interface PermissionRoleDiff {
  role: Role;
  added: AppPermission[];
  removed: AppPermission[];
}

@Injectable({ providedIn: 'root' })
export class PermissionsStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly session = inject(SessionStore);
  private readonly overrides = signal<Partial<Record<Role, AppPermission[]>>>(this.loadOverrides());
  private readonly historyState = signal<PermissionVersion[]>(this.loadHistory());

  readonly role = computed<Role>(() => this.session.session()?.role ?? 'CUSTOMER');
  readonly allPermissions = ALL_PERMISSIONS;
  readonly permissions = computed<AppPermission[]>(() => this.getRolePermissions(this.role()));
  readonly history = this.historyState.asReadonly();

  can(permission: AppPermission): boolean {
    return this.permissions().includes(permission);
  }

  getRolePermissions(role: Role): AppPermission[] {
    const override = this.overrides()[role];
    const source = override && override.length > 0 ? override : DEFAULT_PERMISSION_MATRIX[role];
    return Array.from(new Set(source));
  }

  setRolePermissions(role: Role, permissions: AppPermission[], reason = 'Manual update'): void {
    const next: Partial<Record<Role, AppPermission[]>> = {
      ...this.overrides(),
      [role]: Array.from(new Set(permissions))
    };
    this.persist(next, `${reason} (${role})`);
  }

  resetRolePermissions(role?: Role, reason = 'Reset to defaults'): void {
    if (!role) {
      this.persist({}, reason);
      return;
    }

    const next = { ...this.overrides() };
    delete next[role];
    this.persist(next, `${reason} (${role})`);
  }

  rollback(versionId: string): boolean {
    const version = this.historyState().find((item) => item.id === versionId);
    if (!version) {
      return false;
    }

    this.persist(version.matrix, `Rollback to ${versionId}`);
    return true;
  }

  clearHistory(): void {
    this.historyState.set([]);

    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(HISTORY_KEY);
  }

  getVersion(versionId: string): PermissionVersion | undefined {
    return this.historyState().find((item) => item.id === versionId);
  }

  getMatrixAtVersion(versionId: string): Record<Role, AppPermission[]> | null {
    const version = this.getVersion(versionId);
    if (!version) {
      return null;
    }

    return {
      CUSTOMER: Array.from(new Set(version.matrix.CUSTOMER ?? DEFAULT_PERMISSION_MATRIX.CUSTOMER)),
      ADMIN: Array.from(new Set(version.matrix.ADMIN ?? DEFAULT_PERMISSION_MATRIX.ADMIN))
    };
  }

  diffWithCurrent(versionId: string): PermissionRoleDiff[] {
    const matrix = this.getMatrixAtVersion(versionId);
    if (!matrix) {
      return [];
    }

    return (['CUSTOMER', 'ADMIN'] as Role[]).map((role) => {
      const versionSet = new Set(matrix[role]);
      const currentSet = new Set(this.getRolePermissions(role));

      const added = Array.from(currentSet).filter((perm) => !versionSet.has(perm));
      const removed = Array.from(versionSet).filter((perm) => !currentSet.has(perm));

      return { role, added, removed };
    });
  }

  private persist(next: Partial<Record<Role, AppPermission[]>>, reason: string): void {
    this.overrides.set(next);

    if (this.isBrowser) {
      localStorage.setItem(KEY, JSON.stringify(next));
    }

    const snapshot: PermissionVersion = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      reason,
      matrix: next
    };

    const history = [snapshot, ...this.historyState()].slice(0, 80);
    this.historyState.set(history);

    if (this.isBrowser) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }

  private loadOverrides(): Partial<Record<Role, AppPermission[]>> {
    if (!this.isBrowser) {
      return {};
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Partial<Record<Role, AppPermission[]>>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private loadHistory(): PermissionVersion[] {
    if (!this.isBrowser) {
      return [];
    }

    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as PermissionVersion[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
