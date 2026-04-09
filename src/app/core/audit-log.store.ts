import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const KEY = 'ecom.audit.logs';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

@Injectable({ providedIn: 'root' })
export class AuditLogStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly state = signal<AuditLogEntry[]>(this.load());
  readonly logs = this.state.asReadonly();

  add(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const next: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      ...entry
    };

    this.persist([next, ...this.state()].slice(0, 600));
  }

  clear(): void {
    this.persist([]);
  }

  pending(limit = 50): AuditLogEntry[] {
    return this.state().filter((entry) => entry.syncStatus !== 'synced').slice(0, limit);
  }

  markSynced(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const set = new Set(ids);
    this.persist(
      this.state().map((entry) =>
        set.has(entry.id) ? { ...entry, syncStatus: 'synced' as const } : entry
      )
    );
  }

  markFailed(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const set = new Set(ids);
    this.persist(
      this.state().map((entry) =>
        set.has(entry.id) ? { ...entry, syncStatus: 'failed' as const } : entry
      )
    );
  }

  markPending(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const set = new Set(ids);
    this.persist(
      this.state().map((entry) =>
        set.has(entry.id) ? { ...entry, syncStatus: 'pending' as const } : entry
      )
    );
  }

  remove(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const set = new Set(ids);
    this.persist(this.state().filter((entry) => !set.has(entry.id)));
  }

  private persist(next: AuditLogEntry[]): void {
    this.state.set(next);

    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): AuditLogEntry[] {
    if (!this.isBrowser) {
      return [];
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as AuditLogEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
