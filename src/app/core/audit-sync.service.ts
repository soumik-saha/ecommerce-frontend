import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { ApiClient } from './api-client';
import { AuditLogStore } from './audit-log.store';

@Injectable({ providedIn: 'root' })
export class AuditSyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly api = inject(ApiClient);
  private readonly audit = inject(AuditLogStore);

  private readonly syncing = signal(false);
  private retryDelayMs = 2000;

  readonly isSyncing = this.syncing.asReadonly();

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    window.addEventListener('online', () => {
      void this.syncNow();
    });

    window.setInterval(() => {
      void this.syncNow();
    }, 30000);

    void this.syncNow();
  }

  async syncNow(): Promise<void> {
    return this.syncEntries();
  }

  async syncSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const entries = this.audit.pending(600).filter((entry) => ids.includes(entry.id));
    await this.syncEntries(entries);
  }

  private async syncEntries(sourceEntries?: ReturnType<AuditLogStore['pending']>): Promise<void> {
    if (!this.isBrowser || this.syncing() || !navigator.onLine) {
      return;
    }

    const pendingAll = sourceEntries ?? this.audit.pending(40);
    const pending = this.uniqueBySignature(pendingAll);
    if (pending.length === 0) {
      return;
    }

    this.syncing.set(true);
    const idempotencyKey = this.createIdempotencyKey(pending);

    await new Promise<void>((resolve) => {
      this.api.submitAuditLogs(pending, idempotencyKey).subscribe({
        next: (result) => {
          const groupedIds = this.expandGroupedIds(pending, pendingAll);
          const defaultIds = groupedIds;
          const syncedIds = result.syncedIds?.length ? result.syncedIds : defaultIds;
          const duplicateIds = result.duplicateIds ?? [];
          const conflictIds = result.conflictIds ?? [];

          this.audit.markSynced([...syncedIds, ...duplicateIds]);
          this.audit.markFailed(conflictIds);
          this.retryDelayMs = 2000;
        },
        error: () => {
          this.audit.markFailed(pending.map((entry) => entry.id));
          const delay = this.retryDelayMs;
          this.retryDelayMs = Math.min(30000, this.retryDelayMs * 2);
          this.syncing.set(false);
          window.setTimeout(() => {
            void this.syncNow();
          }, delay);
          resolve();
        },
        complete: () => {
          this.syncing.set(false);
          resolve();
        }
      });
    });
  }

  private uniqueBySignature(entries: ReturnType<AuditLogStore['pending']>): ReturnType<AuditLogStore['pending']> {
    const map = new Map<string, (typeof entries)[number]>();
    for (const entry of entries) {
      const signature = this.signature(entry);
      if (!map.has(signature)) {
        map.set(signature, entry);
      }
    }
    return Array.from(map.values());
  }

  private expandGroupedIds(
    uniqueEntries: ReturnType<AuditLogStore['pending']>,
    allEntries: ReturnType<AuditLogStore['pending']>
  ): string[] {
    const signatures = new Set(uniqueEntries.map((entry) => this.signature(entry)));
    return allEntries
      .filter((entry) => signatures.has(this.signature(entry)))
      .map((entry) => entry.id);
  }

  private signature(entry: ReturnType<AuditLogStore['pending']>[number]): string {
    return `${entry.actor}|${entry.action}|${entry.entity}|${entry.entityId ?? ''}|${entry.details ?? ''}`;
  }

  private createIdempotencyKey(entries: ReturnType<AuditLogStore['pending']>): string {
    const ids = entries.map((entry) => entry.id).join(',');
    return `audit-${ids}`;
  }
}
