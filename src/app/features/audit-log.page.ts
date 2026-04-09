import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuditLogStore } from '../core/audit-log.store';
import { AuditSyncService } from '../core/audit-sync.service';
import { FeatureFlagsStore } from '../core/feature-flags.store';

@Component({
  selector: 'app-audit-log-page',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Audit Log</h2>
        <div class="row">
          <input type="text" [value]="query()" (input)="setQuery($event)" placeholder="Search action, actor, entity" style="max-width:260px;">
          <button type="button" class="secondary" (click)="syncNow()" [disabled]="isSyncing() || pendingCount() === 0">
            {{ isSyncing() ? 'Syncing...' : 'Sync Pending' }}
          </button>
          <button type="button" class="secondary" (click)="exportCsv()" [disabled]="filteredLogs().length === 0">Export CSV</button>
          <button type="button" class="secondary" (click)="clear()" [disabled]="logs().length === 0">Clear</button>
        </div>
      </div>

      <p class="muted">Total entries: {{ logs().length }}</p>
      <p class="muted">Pending sync: {{ pendingCount() }}</p>

      @if (conflictActionsEnabled() && failedLogs().length > 0) {
        <section class="page" style="padding:12px;margin-bottom:10px;">
          <div class="toolbar">
            <h3 style="margin:0;">Sync Conflicts</h3>
            <div class="row">
              <button type="button" class="secondary" (click)="toggleSelectAllFailed()">
                {{ allFailedSelected() ? 'Unselect All Failed' : 'Select All Failed' }}
              </button>
              <button type="button" class="secondary" (click)="retrySelected()" [disabled]="selectedFailedIds().length === 0 || isSyncing()">
                Retry Selected
              </button>
              <button type="button" (click)="discardSelected()" [disabled]="selectedFailedIds().length === 0">
                Discard Selected
              </button>
            </div>
          </div>

          @for (entry of failedLogs(); track entry.id) {
            <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:8px 0;">
              <label class="row" style="align-items:flex-start;flex:1;">
                <input
                  type="checkbox"
                  [checked]="selectedFailedIds().includes(entry.id)"
                  (change)="toggleFailedSelection(entry.id)"
                  style="width:auto;margin-top:4px;"
                >
                <span>{{ entry.action }} • {{ entry.entity }} • {{ entry.details || 'No details' }}</span>
              </label>
              <small class="muted">{{ entry.timestamp | date:'short' }}</small>
            </article>
          }
        </section>
      }

      @if (filteredLogs().length === 0) {
        <p class="muted">No audit entries found.</p>
      }

      @for (entry of filteredLogs(); track entry.id) {
        <article class="row" style="justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line-soft);padding:10px 0;">
          <div style="flex:1;">
            <strong>{{ entry.action }}</strong>
            <p class="muted" style="margin:4px 0;">{{ entry.entity }} @ {{ entry.entityId || 'n/a' }}</p>
            @if (entry.details) {
              <p class="muted" style="margin:4px 0;">{{ entry.details }}</p>
            }
          </div>
          <div style="text-align:right;min-width:220px;">
            <small class="muted">{{ entry.syncStatus || 'pending' }}</small><br>
            <small class="muted">{{ entry.actor }}</small><br>
            <small class="muted">{{ entry.timestamp | date:'medium' }}</small>
          </div>
        </article>
      }
    </section>
  `
})
export class AuditLogPage {
  private readonly audit = inject(AuditLogStore);
  private readonly sync = inject(AuditSyncService);
  private readonly flags = inject(FeatureFlagsStore);
  protected readonly logs = this.audit.logs;
  protected readonly isSyncing = this.sync.isSyncing;
  protected readonly conflictActionsEnabled = computed(() => this.flags.isEnabled('auditConflictActions'));
  protected readonly query = signal('');
  protected readonly selectedFailedIds = signal<string[]>([]);
  protected readonly pendingCount = computed(() => this.logs().filter((entry) => entry.syncStatus !== 'synced').length);
  protected readonly failedLogs = computed(() => this.logs().filter((entry) => entry.syncStatus === 'failed'));
  protected readonly allFailedSelected = computed(() => {
    const failedIds = this.failedLogs().map((entry) => entry.id);
    if (failedIds.length === 0) {
      return false;
    }
    return failedIds.every((id) => this.selectedFailedIds().includes(id));
  });

  protected readonly filteredLogs = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.logs();
    }

    return this.logs().filter((entry) =>
      `${entry.actor} ${entry.action} ${entry.entity} ${entry.details ?? ''}`.toLowerCase().includes(q)
    );
  });

  protected setQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  protected clear(): void {
    this.audit.clear();
    this.selectedFailedIds.set([]);
  }

  protected syncNow(): void {
    void this.sync.syncNow();
  }

  protected toggleFailedSelection(id: string): void {
    this.selectedFailedIds.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  protected toggleSelectAllFailed(): void {
    const failedIds = this.failedLogs().map((entry) => entry.id);
    if (failedIds.length === 0) {
      return;
    }

    if (this.allFailedSelected()) {
      this.selectedFailedIds.set([]);
      return;
    }

    this.selectedFailedIds.set(failedIds);
  }

  protected retrySelected(): void {
    const ids = this.selectedFailedIds();
    if (ids.length === 0) {
      return;
    }

    this.audit.markPending(ids);
    this.selectedFailedIds.set([]);
    void this.sync.syncSelected(ids);
  }

  protected discardSelected(): void {
    const ids = this.selectedFailedIds();
    if (ids.length === 0) {
      return;
    }

    this.audit.remove(ids);
    this.selectedFailedIds.set([]);
  }

  protected exportCsv(): void {
    const header = ['timestamp', 'actor', 'action', 'entity', 'entityId', 'details'];
    const rows = this.filteredLogs().map((entry) => [
      entry.timestamp,
      entry.actor,
      entry.action,
      entry.entity,
      entry.entityId ?? '',
      entry.details ?? ''
    ]);

    const esc = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const lines = [header.join(','), ...rows.map((row) => row.map(esc).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
