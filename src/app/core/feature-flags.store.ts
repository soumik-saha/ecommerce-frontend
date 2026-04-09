import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const KEY = 'ecom.feature.flags';
const REQUESTS_KEY = 'ecom.feature.flag.requests';

export type FeatureFlagKey =
  | 'advancedWishlistTools'
  | 'observabilityDashboard'
  | 'auditConflictActions';

export interface FeatureFlagsState {
  advancedWishlistTools: boolean;
  observabilityDashboard: boolean;
  auditConflictActions: boolean;
}

export interface FeatureFlagEntry {
  key: FeatureFlagKey;
  enabled: boolean;
  locked: boolean;
  source: 'default' | 'override';
}

export interface FeatureFlagChangeRequest {
  id: string;
  createdAt: string;
  createdBy: string;
  reason: string;
  type: 'toggle' | 'reset';
  flag?: FeatureFlagKey;
  targetEnabled?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

const DEFAULT_FLAGS: FeatureFlagsState = {
  advancedWishlistTools: typeof environment.featureFlags?.defaults?.advancedWishlistTools === 'boolean'
    ? environment.featureFlags.defaults.advancedWishlistTools
    : true,
  observabilityDashboard: typeof environment.featureFlags?.defaults?.observabilityDashboard === 'boolean'
    ? environment.featureFlags.defaults.observabilityDashboard
    : true,
  auditConflictActions: typeof environment.featureFlags?.defaults?.auditConflictActions === 'boolean'
    ? environment.featureFlags.defaults.auditConflictActions
    : true
};

const LOCKED_FLAGS = new Set<FeatureFlagKey>((environment.featureFlags?.locked ?? []) as FeatureFlagKey[]);

@Injectable({ providedIn: 'root' })
export class FeatureFlagsStore {
  private readonly state = signal<FeatureFlagsState>(this.load());
  private readonly requestsState = signal<FeatureFlagChangeRequest[]>(this.loadRequests());
  private readonly sourceState = signal<Record<FeatureFlagKey, 'default' | 'override'>>({
    advancedWishlistTools: this.isValueDefault('advancedWishlistTools', this.state().advancedWishlistTools) ? 'default' : 'override',
    observabilityDashboard: this.isValueDefault('observabilityDashboard', this.state().observabilityDashboard) ? 'default' : 'override',
    auditConflictActions: this.isValueDefault('auditConflictActions', this.state().auditConflictActions) ? 'default' : 'override'
  });

  readonly flags = this.state.asReadonly();
  readonly requests = this.requestsState.asReadonly();
  readonly entries = computed<FeatureFlagEntry[]>(() =>
    Object.entries(this.state()).map(([key, enabled]) => ({
      key: key as FeatureFlagKey,
      enabled,
      locked: this.isLocked(key as FeatureFlagKey),
      source: this.sourceState()[key as FeatureFlagKey]
    }))
  );

  isEnabled(flag: FeatureFlagKey): boolean {
    return this.state()[flag];
  }

  isLocked(flag: FeatureFlagKey): boolean {
    return LOCKED_FLAGS.has(flag);
  }

  setFlag(flag: FeatureFlagKey, enabled: boolean): void {
    if (this.isLocked(flag)) {
      return;
    }

    this.persist({
      ...this.state(),
      [flag]: enabled
    });

    this.sourceState.update((state) => ({
      ...state,
      [flag]: this.isValueDefault(flag, enabled) ? 'default' : 'override'
    }));
  }

  toggle(flag: FeatureFlagKey): void {
    this.setFlag(flag, !this.state()[flag]);
  }

  submitToggleRequest(
    flag: FeatureFlagKey,
    targetEnabled: boolean,
    createdBy: string,
    reason: string
  ): FeatureFlagChangeRequest | null {
    if (this.isLocked(flag)) {
      return null;
    }

    const request: FeatureFlagChangeRequest = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      createdBy,
      reason,
      type: 'toggle',
      flag,
      targetEnabled,
      status: 'pending'
    };

    this.persistRequests([request, ...this.requestsState()].slice(0, 200));
    return request;
  }

  submitResetRequest(createdBy: string, reason: string): FeatureFlagChangeRequest {
    const request: FeatureFlagChangeRequest = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      createdBy,
      reason,
      type: 'reset',
      status: 'pending'
    };

    this.persistRequests([request, ...this.requestsState()].slice(0, 200));
    return request;
  }

  approveRequest(requestId: string, reviewedBy: string, reviewNote?: string): boolean {
    const target = this.requestsState().find((item) => item.id === requestId && item.status === 'pending');
    if (!target) {
      return false;
    }

    if (target.type === 'toggle' && target.flag && typeof target.targetEnabled === 'boolean') {
      this.setFlag(target.flag, target.targetEnabled);
    } else if (target.type === 'reset') {
      this.resetDefaults();
    }

    this.persistRequests(
      this.requestsState().map((item) =>
        item.id === requestId
          ? {
            ...item,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy,
            reviewNote: reviewNote?.trim() || undefined
          }
          : item
      )
    );

    return true;
  }

  rejectRequest(requestId: string, reviewedBy: string, reviewNote?: string): boolean {
    const target = this.requestsState().find((item) => item.id === requestId && item.status === 'pending');
    if (!target) {
      return false;
    }

    this.persistRequests(
      this.requestsState().map((item) =>
        item.id === requestId
          ? {
            ...item,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy,
            reviewNote: reviewNote?.trim() || undefined
          }
          : item
      )
    );

    return true;
  }

  clearResolvedRequests(): void {
    this.persistRequests(this.requestsState().filter((item) => item.status === 'pending'));
  }

  resetDefaults(): void {
    this.persist(DEFAULT_FLAGS);
    this.sourceState.set({
      advancedWishlistTools: 'default',
      observabilityDashboard: 'default',
      auditConflictActions: 'default'
    });
  }

  private persist(next: FeatureFlagsState): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private persistRequests(next: FeatureFlagChangeRequest[]): void {
    this.requestsState.set(next);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(next));
  }

  private load(): FeatureFlagsState {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_FLAGS;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<FeatureFlagsState>;
      return {
        advancedWishlistTools:
          typeof parsed.advancedWishlistTools === 'boolean'
            ? parsed.advancedWishlistTools
            : DEFAULT_FLAGS.advancedWishlistTools,
        observabilityDashboard:
          typeof parsed.observabilityDashboard === 'boolean'
            ? parsed.observabilityDashboard
            : DEFAULT_FLAGS.observabilityDashboard,
        auditConflictActions:
          typeof parsed.auditConflictActions === 'boolean'
            ? parsed.auditConflictActions
            : DEFAULT_FLAGS.auditConflictActions
      };
    } catch {
      return DEFAULT_FLAGS;
    }
  }

  private loadRequests(): FeatureFlagChangeRequest[] {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as FeatureFlagChangeRequest[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item) =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.createdAt === 'string' &&
          typeof item.createdBy === 'string' &&
          typeof item.reason === 'string' &&
          typeof item.type === 'string' &&
          typeof item.status === 'string'
        )
        .slice(0, 200);
    } catch {
      return [];
    }
  }

  private isValueDefault(flag: FeatureFlagKey, value: boolean): boolean {
    return DEFAULT_FLAGS[flag] === value;
  }
}
