import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiClient } from '../core/api-client';
import { AuditLogStore } from '../core/audit-log.store';
import { FeatureFlagChangeRequest, FeatureFlagKey, FeatureFlagsStore } from '../core/feature-flags.store';
import { Order, Product, ProductRequest, Role, User, UserRequest } from '../core/models';
import { EndpointReliabilityInsight, ObservabilityStore } from '../core/observability.store';
import { AppPermission, PermissionRoleDiff, PermissionsStore } from '../core/permissions.store';
import { SessionStore } from '../core/session.store';
import { SloPolicyStore } from '../core/slo-policy.store';
import { UiToastService } from '../core/ui-toast.service';

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Admin Console</h2>
        <div class="row">
          @if (can('admin.export.csv')) {
            <button type="button" class="secondary" (click)="exportCsv('products')">Export Products CSV (Filtered)</button>
            <button type="button" class="secondary" (click)="exportCsv('orders')">Export Orders CSV (Filtered)</button>
            <button type="button" class="secondary" (click)="exportCsv('users')">Export Users CSV</button>
            <button type="button" class="secondary" (click)="exportAnalyticsSnapshot()">Export Analytics Snapshot</button>
          }
          <button type="button" class="secondary" (click)="reload()" [disabled]="loading()">Refresh Data</button>
        </div>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (message()) { <p class="ok">{{ message() }}</p> }

      @if (can('admin.audit.view')) {
        <section class="page" style="padding:14px;margin-top:10px;">
          <div class="toolbar">
            <h3 style="margin:0;">Permission Matrix Editor</h3>
            <div class="row">
              <label class="label" style="min-width:170px;">
                Target Role
                <select [value]="selectedRole()" (change)="setSelectedRole($event)">
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <button type="button" class="secondary" (click)="resetRolePermissions()">Reset Role Defaults</button>
            </div>
          </div>

          <div class="grid two">
            @for (permission of allPermissions; track permission) {
              <label class="row" style="align-items:flex-start;">
                <input
                  type="checkbox"
                  [checked]="isRolePermissionEnabled(permission)"
                  (change)="toggleRolePermission(permission, $event)"
                  style="width:auto;margin-top:4px;"
                >
                <span>{{ permission }}</span>
              </label>
            }
          </div>

          <div class="toolbar" style="margin-top:10px;">
            <h4 style="margin:0;">Permission Version History</h4>
            <button type="button" class="secondary" (click)="clearPermissionHistory()" [disabled]="permissionHistory().length === 0">Clear History</button>
          </div>

          @if (permissionHistory().length === 0) {
            <p class="muted">No permission snapshots yet.</p>
          }

          @for (version of permissionHistory(); track version.id) {
            <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:8px 0;">
              <div>
                <strong>{{ version.reason }}</strong>
                <p class="muted" style="margin:4px 0 0;">{{ version.timestamp | date:'medium' }}</p>
              </div>
              <div class="row">
                <button type="button" class="secondary" (click)="comparePermissions(version.id)">Compare</button>
                <button type="button" class="secondary" (click)="rollbackPermissions(version.id)">Rollback</button>
              </div>
            </article>
          }

          @if (selectedPermissionVersion()) {
            <section class="page" style="margin-top:10px;padding:12px;border:1px solid var(--line-soft);">
              <div class="toolbar">
                <h4 style="margin:0;">Permission Diff vs Current ({{ selectedPermissionVersion()!.timestamp | date:'medium' }})</h4>
                <button type="button" class="secondary" (click)="clearPermissionDiffView()">Close Diff</button>
              </div>

              @for (entry of permissionDiff(); track entry.role) {
                <article style="border-top:1px solid var(--line-soft);padding-top:10px;margin-top:10px;">
                  <strong>{{ entry.role }}</strong>
                  <p class="muted" style="margin:6px 0 4px;">Added since snapshot: {{ entry.added.length }}</p>
                  @if (entry.added.length === 0) {
                    <p class="muted" style="margin:0 0 8px;">None</p>
                  } @else {
                    <div class="row" style="flex-wrap:wrap;gap:6px;">
                      @for (perm of entry.added; track perm) {
                        <span class="chip">+ {{ perm }}</span>
                      }
                    </div>
                  }

                  <p class="muted" style="margin:10px 0 4px;">Removed since snapshot: {{ entry.removed.length }}</p>
                  @if (entry.removed.length === 0) {
                    <p class="muted" style="margin:0;">None</p>
                  } @else {
                    <div class="row" style="flex-wrap:wrap;gap:6px;">
                      @for (perm of entry.removed; track perm) {
                        <span class="chip">- {{ perm }}</span>
                      }
                    </div>
                  }
                </article>
              }
            </section>
          }
        </section>
      }

      @if (can('admin.dashboard.view')) {
        <section class="page" style="padding:14px;margin-top:10px;">
          <div class="toolbar">
            <h3 style="margin:0;">Runtime Feature Flags</h3>
            <button type="button" class="secondary" (click)="submitResetRequest()" [disabled]="featureFlagReason().trim().length < 5">Submit Reset Request</button>
          </div>

          <label class="label" style="margin:8px 0 10px;display:block;">
            Change Reason (min 5 chars)
            <input
              type="text"
              [value]="featureFlagReason()"
              (input)="setFeatureFlagReason($event)"
              placeholder="ex: incident mitigation for checkout failure"
            >
          </label>

          @for (entry of featureFlagEntries(); track entry.key) {
            <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:8px 0;">
              <div>
                <strong>{{ entry.key }}</strong>
                <p class="muted" style="margin:4px 0 0;">
                  {{ entry.enabled ? 'Enabled' : 'Disabled' }} • source={{ entry.source }}
                  @if (entry.locked) { • locked }
                </p>
              </div>
              <button type="button" class="secondary" (click)="submitToggleRequest(entry.key)" [disabled]="entry.locked || featureFlagReason().trim().length < 5">
                Request {{ entry.enabled ? 'Disable' : 'Enable' }}
              </button>
            </article>
          }
        </section>

        <section class="page" style="padding:14px;margin-top:10px;">
          <div class="toolbar">
            <h3 style="margin:0;">Flag Change Approval Queue</h3>
            <button type="button" class="secondary" (click)="clearResolvedFlagRequests()" [disabled]="resolvedFlagRequests().length === 0">Clear Resolved</button>
          </div>

          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:8px;">
            <label class="label">
              Approver Identity
              <input type="email" [value]="approvalActor()" (input)="setApprovalActor($event)" placeholder="approver@company.com">
            </label>
            <label class="label">
              Review Note
              <input type="text" [value]="approvalNote()" (input)="setApprovalNote($event)" placeholder="Optional decision note">
            </label>
          </div>

          @if (pendingFlagRequests().length === 0) {
            <p class="muted">No pending requests.</p>
          }

          @for (request of pendingFlagRequests(); track request.id) {
            <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:8px 0;">
              <div>
                <strong>{{ request.type === 'toggle' ? 'Toggle' : 'Reset' }}</strong>
                <span class="muted"> • {{ request.flag ?? 'all flags' }}</span>
                <p class="muted" style="margin:4px 0 0;">Requested by {{ request.createdBy }} at {{ request.createdAt | date:'short' }}</p>
                <p class="muted" style="margin:2px 0 0;">Reason: {{ request.reason }}</p>
              </div>
              <div class="row">
                <button type="button" class="secondary" (click)="approveFlagRequest(request.id)">Approve</button>
                <button type="button" (click)="rejectFlagRequest(request.id)">Reject</button>
              </div>
            </article>
          }
        </section>

        @if (featureFlagEnabled('observabilityDashboard')) {
          <section class="page" style="padding:14px;margin-top:10px;">
            <div class="toolbar">
              <h3 style="margin:0;">Platform Reliability Snapshot</h3>
              <div class="row">
                <button type="button" class="secondary" (click)="exportReliabilitySnapshot()">Export Reliability CSV</button>
                <button type="button" class="secondary" (click)="clearObservability()" [disabled]="reliabilitySummary().totalEvents === 0">Clear Metrics</button>
              </div>
            </div>

            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-top:8px;">
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">Total Events</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().totalEvents }}</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">HTTP Requests</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().totalHttpRequests }}</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">HTTP Failures</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().failedHttpRequests }}</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">Avg HTTP Latency</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().avgHttpLatencyMs }} ms</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">P95 HTTP Latency</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().p95HttpLatencyMs }} ms</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">P99 HTTP Latency</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().p99HttpLatencyMs }} ms</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">Availability</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().availabilityPct }}%</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">HTTP Error Rate</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().errorRatePct }}%</h4></article>
              <article class="page" style="padding:10px;"><p class="muted" style="margin:0;">Client Errors</p><h4 style="margin:6px 0 0;">{{ reliabilitySummary().totalErrors }}</h4></article>
            </div>

            <section class="page" style="padding:12px;margin-top:10px;">
              <div class="toolbar">
                <h4 style="margin:0;">SLO Policy</h4>
                <button type="button" class="secondary" (click)="resetSloPolicy()">Reset Policy</button>
              </div>

              <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));">
                <label class="label">
                  Availability Min %
                  <input type="number" step="0.1" min="0" max="100" [value]="sloPolicy().availabilityMinPct" (input)="setSloAvailability($event)">
                </label>
                <label class="label">
                  P95 Max Latency (ms)
                  <input type="number" min="50" max="15000" [value]="sloPolicy().p95LatencyMaxMs" (input)="setSloP95($event)">
                </label>
                <label class="label">
                  Error Rate Max %
                  <input type="number" step="0.1" min="0" max="100" [value]="sloPolicy().errorRateMaxPct" (input)="setSloErrorRate($event)">
                </label>
              </div>

              @if (sloBreaches().length === 0) {
                <p class="muted" style="margin-top:8px;">No active SLO breaches.</p>
              }
              @for (breach of sloBreaches(); track breach.id) {
                <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:6px 0;">
                  <div>
                    <strong>{{ breach.title }}</strong>
                    <p class="muted" style="margin:4px 0 0;">{{ breach.description }}</p>
                  </div>
                  <small class="muted">{{ breach.severity }}</small>
                </article>
              }
            </section>

            <h4 style="margin:12px 0 8px;">Endpoint Reliability Hotspots</h4>
            @if (endpointInsights().length === 0) {
              <p class="muted">No HTTP telemetry yet.</p>
            }
            @for (entry of endpointInsights(); track entry.endpoint) {
              <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:6px 0;">
                <div>
                  <strong>{{ entry.endpoint }}</strong>
                  <p class="muted" style="margin:4px 0 0;">Requests: {{ entry.requests }} • Failed: {{ entry.failed }}</p>
                </div>
                <div style="text-align:right;">
                  <small class="muted">Failure: {{ entry.failureRatePct }}%</small><br>
                  <small class="muted">Avg: {{ entry.avgLatencyMs }} ms</small><br>
                  <small class="muted">P95: {{ entry.p95LatencyMs }} ms</small>
                </div>
              </article>
            }

            <h4 style="margin:12px 0 8px;">Incident Timeline</h4>
            @if (incidentTimeline().length === 0) {
              <p class="muted">No incidents detected yet.</p>
            }
            @for (incident of incidentTimeline(); track incident.id) {
              <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:6px 0;">
                <div>
                  <strong>{{ incident.title }}</strong>
                  <p class="muted" style="margin:4px 0 0;">{{ incident.description }}</p>
                </div>
                <div style="text-align:right;">
                  <small class="muted">{{ incident.source }} • {{ incident.severity }}</small><br>
                  <small class="muted">{{ incident.timestamp | date:'short' }}</small>
                </div>
              </article>
            }

            <h4 style="margin:12px 0 8px;">Recent Metrics</h4>
            @if (recentMetrics().length === 0) {
              <p class="muted">No reliability events yet.</p>
            }
            @for (metric of recentMetrics(); track metric.id) {
              <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:6px 0;">
                <div>
                  <strong>{{ metric.type }}</strong>
                  <span class="muted"> • {{ metric.name }}</span>
                  @if (metric.metadata) {
                    <p class="muted" style="margin:4px 0 0;">{{ metric.metadata }}</p>
                  }
                </div>
                <div style="text-align:right;">
                  <small class="muted">{{ metric.status ?? '-' }}</small><br>
                  <small class="muted">{{ metric.durationMs ?? 0 }} ms</small><br>
                  <small class="muted">{{ metric.timestamp | date:'short' }}</small>
                </div>
              </article>
            }
          </section>
        }
      }

      @if (can('admin.dashboard.view')) {
        <section class="page" style="padding:14px;margin-top:10px;">
          <h3 style="margin-top:0;">Analytics Filters</h3>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
            <label class="label">
              Date From
              <input type="date" [value]="dateFrom()" (input)="setDateFrom($event)">
            </label>
            <label class="label">
              Date To
              <input type="date" [value]="dateTo()" (input)="setDateTo($event)">
            </label>
            <label class="label">
              Order Status
              <select [value]="statusFilter()" (change)="setStatusFilter($event)">
                <option value="ALL">ALL</option>
                @for (status of statusOptions(); track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </label>
            <label class="label">
              Product Category
              <select [value]="categoryFilter()" (change)="setCategoryFilter($event)">
                <option value="ALL">ALL</option>
                @for (category of categoryOptions(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </label>
          </div>
        </section>

        <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:10px;">
          <article class="page" style="padding:14px;"><p class="muted" style="margin:0;">Total Products</p><h3 style="margin:6px 0 0;">{{ totalProducts() }}</h3></article>
          <article class="page" style="padding:14px;"><p class="muted" style="margin:0;">Total Orders</p><h3 style="margin:6px 0 0;">{{ totalOrders() }}</h3></article>
          <article class="page" style="padding:14px;"><p class="muted" style="margin:0;">Registered Users</p><h3 style="margin:6px 0 0;">{{ totalUsers() }}</h3></article>
          <article class="page" style="padding:14px;"><p class="muted" style="margin:0;">Gross Revenue</p><h3 style="margin:6px 0 0;">{{ grossRevenue() | currency:'INR' }}</h3></article>
        </section>

        <section class="grid two" style="margin-top:12px;">
          <article class="page" style="padding:14px;">
            <h3 style="margin-top:0;">Revenue Trend (Recent Orders)</h3>
            <svg viewBox="0 0 640 220" style="width:100%;height:220px;background:#f8fbff;border:1px solid var(--line-soft);border-radius:12px;">
              <polyline [attr.points]="revenueLinePoints()" fill="none" stroke="var(--brand-600)" stroke-width="3"></polyline>
              @for (point of revenuePlotPoints(); track point.x) {
                <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" fill="var(--brand-700)"></circle>
              }
            </svg>
            <div class="row" style="justify-content:space-between;margin-top:8px;">
              @for (label of revenueLabels(); track $index) {
                <small class="muted">{{ label }}</small>
              }
            </div>
          </article>

          <article class="page" style="padding:14px;">
            <h3 style="margin-top:0;">Order Status Distribution</h3>
            <div class="row" style="align-items:flex-start;gap:16px;">
              <div [style.background]="statusConicGradient()" style="width:150px;height:150px;border-radius:999px;border:1px solid var(--line-soft);"></div>
              <div style="flex:1;">
                @for (entry of orderStatusInsights(); track entry.status) {
                  <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:8px 0;">
                    <span>{{ entry.status }}</span>
                    <strong>{{ entry.count }}</strong>
                  </div>
                }
              </div>
            </div>
          </article>
        </section>
      }

      @if (can('admin.product.bulk') || can('admin.product.edit') || can('admin.product.delete')) {
        <section class="page" style="margin-top:12px;padding:14px;">
          <div class="toolbar">
            <h3 style="margin:0;">Product Operations</h3>
            <div class="row">
              <input type="text" [value]="productQuery()" (input)="setProductQuery($event)" placeholder="Search product or category" style="max-width:260px;">
              @if (can('admin.product.bulk')) {
                <button type="button" class="secondary" (click)="toggleSelectAllVisible()">{{ allVisibleSelected() ? 'Unselect Visible' : 'Select Visible' }}</button>
              }
            </div>
          </div>

          @if (can('admin.product.bulk')) {
            <div class="row" style="margin-bottom:10px;">
              <input type="text" [value]="bulkCategory()" (input)="setBulkCategory($event)" placeholder="Bulk set category" style="max-width:220px;">
              <input type="number" [value]="bulkDiscountPercent()" (input)="setBulkDiscount($event)" min="0" max="90" placeholder="Discount %" style="max-width:140px;">
              <button type="button" class="secondary" (click)="applyBulkCategory()" [disabled]="selectedCount() === 0">Apply Category</button>
              <button type="button" class="secondary" (click)="applyBulkDiscount()" [disabled]="selectedCount() === 0">Apply Discount</button>
              <button type="button" (click)="deleteSelectedProducts()" [disabled]="selectedCount() === 0">Delete Selected</button>
              <small class="muted">{{ selectedCount() }} selected</small>
            </div>
          }

          @if (filteredProducts().length === 0) {
            <p class="muted">No products matched the search.</p>
          }

          @for (product of filteredProducts(); track product.id) {
            <article class="row" style="justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:10px 0;">
              <div class="row" style="flex:1;">
                @if (can('admin.product.bulk')) {
                  <input type="checkbox" [checked]="isSelected(product.id)" (change)="toggleSelection(product.id)" style="width:auto;">
                }
                <div>
                  <strong>{{ product.name }}</strong>
                  <small class="muted"> ({{ product.category }})</small>
                  <small class="muted"> • Stock {{ product.stockQuantity }}</small>
                  <small class="muted"> • {{ product.price | currency:'INR' }}</small>
                </div>
              </div>
              <div class="row">
                @if (can('admin.product.edit')) {
                  <button type="button" class="secondary" (click)="startEdit(product)">Edit</button>
                }
                @if (can('admin.product.delete')) {
                  <button type="button" class="secondary" (click)="deleteOneProduct(product.id)">Delete</button>
                }
              </div>
            </article>
          }

          @if (editingProductId() && can('admin.product.edit')) {
            <form class="grid two" [formGroup]="editForm" (ngSubmit)="saveEdit()" style="margin-top:12px;">
              <label class="label">Name <input type="text" formControlName="name"></label>
              <label class="label">Category <input type="text" formControlName="category"></label>
              <label class="label" style="grid-column:1/-1;">Description <textarea formControlName="description"></textarea></label>
              <label class="label">Price <input type="number" formControlName="price" step="0.01"></label>
              <label class="label">Stock <input type="number" formControlName="stockQuantity"></label>
              <label class="label" style="grid-column:1/-1;">Image URL <input type="text" formControlName="imageUrl"></label>
              <div class="row" style="grid-column:1/-1;">
                <button type="submit" [disabled]="loading()">Save Product Changes</button>
                <button type="button" class="secondary" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          }
        </section>
      }

      @if (can('admin.product.create')) {
        <h3 style="margin-top: 16px;">Create Product</h3>
        <form class="grid two" [formGroup]="productForm" (ngSubmit)="saveProduct()">
          <label class="label">Name <input type="text" formControlName="name"></label>
          <label class="label">Category <input type="text" formControlName="category"></label>
          <label class="label" style="grid-column:1/-1;">Description <textarea formControlName="description"></textarea></label>
          <label class="label">Price <input type="number" formControlName="price" step="0.01"></label>
          <label class="label">Stock <input type="number" formControlName="stockQuantity"></label>
          <label class="label" style="grid-column:1/-1;">Image URL <input type="text" formControlName="imageUrl"></label>
          <div class="row" style="grid-column:1/-1;">
            <button [disabled]="loading()">{{ loading() ? 'Saving...' : 'Save Product' }}</button>
            <button type="button" class="secondary" (click)="resetProductForm()">Reset</button>
          </div>
        </form>
      }

      @if (can('admin.user.create')) {
        <h3 style="margin-top: 20px;">Create Managed User</h3>
        <form class="grid two" [formGroup]="userForm" (ngSubmit)="saveUser()">
          <label class="label">First Name <input type="text" formControlName="firstName"></label>
          <label class="label">Last Name <input type="text" formControlName="lastName"></label>
          <label class="label">Email <input type="email" formControlName="email"></label>
          <label class="label">Phone <input type="text" formControlName="phone"></label>
          <div class="grid two" formGroupName="address" style="grid-column:1/-1;">
            <label class="label">Street <input type="text" formControlName="street"></label>
            <label class="label">City <input type="text" formControlName="city"></label>
            <label class="label">State <input type="text" formControlName="state"></label>
            <label class="label">Zipcode <input type="text" formControlName="zipcode"></label>
            <label class="label" style="grid-column:1/-1;">Country <input type="text" formControlName="country"></label>
          </div>
          <div class="row" style="grid-column:1/-1;">
            <button [disabled]="loading()">{{ loading() ? 'Saving...' : 'Save User' }}</button>
            <button type="button" class="secondary" (click)="resetUserForm()">Reset</button>
          </div>
        </form>
      }
    </section>
  `
})
export class AdminPage {
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly permissions = inject(PermissionsStore);
  private readonly audit = inject(AuditLogStore);
  private readonly flags = inject(FeatureFlagsStore);
  private readonly observability = inject(ObservabilityStore);
  private readonly slo = inject(SloPolicyStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(UiToastService);

  protected readonly products = signal<Product[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');

  protected readonly productQuery = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly statusFilter = signal('ALL');
  protected readonly categoryFilter = signal('ALL');
  protected readonly selectedRole = signal<Role>('CUSTOMER');
  protected readonly featureFlagReason = signal('');
  protected readonly approvalActor = signal('');
  protected readonly approvalNote = signal('');
  protected readonly selectedPermissionVersionId = signal<string | null>(null);
  protected readonly selectedProductIds = signal<number[]>([]);
  protected readonly bulkCategory = signal('');
  protected readonly bulkDiscountPercent = signal(0);
  protected readonly editingProductId = signal<number | null>(null);
  protected readonly allPermissions = this.permissions.allPermissions;
  protected readonly permissionHistory = this.permissions.history;
  protected readonly featureFlagEntries = this.flags.entries;
  protected readonly flagRequests = this.flags.requests;
  protected readonly reliabilitySummary = this.observability.summary;
  protected readonly recentMetrics = this.observability.recentMetrics;
  protected readonly endpointInsights = this.observability.endpointInsights;
  protected readonly sloPolicy = this.slo.policy;
  protected readonly pendingFlagRequests = computed(() => this.flagRequests().filter((item) => item.status === 'pending'));
  protected readonly resolvedFlagRequests = computed(() => this.flagRequests().filter((item) => item.status !== 'pending'));
  protected readonly sloBreaches = computed(() => this.slo.evaluate({
    availabilityPct: this.reliabilitySummary().availabilityPct,
    p95HttpLatencyMs: this.reliabilitySummary().p95HttpLatencyMs,
    totalHttpRequests: this.reliabilitySummary().totalHttpRequests,
    failedHttpRequests: this.reliabilitySummary().failedHttpRequests
  }));
  protected readonly incidentTimeline = computed(() => {
    const sloEvents = this.sloBreaches().map((breach, index) => ({
      id: `slo-${breach.id}-${index}`,
      timestamp: new Date().toISOString(),
      source: 'slo',
      severity: breach.severity,
      title: breach.title,
      description: breach.description
    }));

    const metricEvents = this.recentMetrics()
      .filter((metric) =>
        metric.type === 'error' ||
        (metric.type === 'http' && ((metric.status ?? 0) >= 500 || (metric.durationMs ?? 0) > this.sloPolicy().p95LatencyMaxMs * 1.5))
      )
      .map((metric) => ({
        id: `metric-${metric.id}`,
        timestamp: metric.timestamp,
        source: 'telemetry',
        severity: metric.type === 'error' || (metric.status ?? 0) >= 500 ? 'high' as const : 'medium' as const,
        title: metric.type === 'error' ? 'Client error captured' : 'HTTP anomaly detected',
        description: `${metric.name} (${metric.status ?? '-'}) ${metric.durationMs ?? 0}ms`
      }));

    const auditEvents = this.audit.logs()
      .slice(0, 20)
      .map((entry) => ({
        id: `audit-${entry.id}`,
        timestamp: entry.timestamp,
        source: 'audit',
        severity: /(DELETE|RESET|ROLLBACK|REJECT)/.test(entry.action) ? 'medium' as const : 'low' as const,
        title: entry.action,
        description: `${entry.actor} • ${entry.entity}${entry.details ? ` • ${entry.details}` : ''}`
      }));

    return [...sloEvents, ...metricEvents, ...auditEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);
  });
  protected readonly selectedPermissionVersion = computed(() => {
    const id = this.selectedPermissionVersionId();
    if (!id) {
      return null;
    }
    return this.permissions.getVersion(id) ?? null;
  });
  protected readonly permissionDiff = computed<PermissionRoleDiff[]>(() => {
    const id = this.selectedPermissionVersionId();
    if (!id) {
      return [];
    }
    return this.permissions.diffWithCurrent(id);
  });

  protected readonly totalProducts = computed(() => this.filteredProducts().length);
  protected readonly totalOrders = computed(() => this.filteredOrders().length);
  protected readonly totalUsers = computed(() => this.users().length);
  protected readonly grossRevenue = computed(() => this.filteredOrders().reduce((acc, order) => acc + Number(order.totalAmount || 0), 0));

  protected readonly categoryOptions = computed(() =>
    Array.from(new Set(this.products().map((item) => item.category))).sort((a, b) => a.localeCompare(b))
  );

  protected readonly statusOptions = computed(() =>
    Array.from(new Set(this.orders().map((order) => this.normalizeStatus(order.status)))).sort((a, b) => a.localeCompare(b))
  );

  protected readonly filteredOrders = computed(() => {
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    return this.orders().filter((order) => {
      const normalized = this.normalizeStatus(order.status);
      if (status !== 'ALL' && normalized !== status) {
        return false;
      }

      if (!order.createdAt) {
        return true;
      }

      const dateKey = this.getOrderDate(order);
      if (from && dateKey < from) {
        return false;
      }
      if (to && dateKey > to) {
        return false;
      }
      return true;
    });
  });

  protected readonly filteredProducts = computed(() => {
    const q = this.productQuery().trim().toLowerCase();
    const selectedCategory = this.categoryFilter();

    if (!q) {
      return this.products().filter((product) => selectedCategory === 'ALL' || product.category === selectedCategory);
    }
    return this.products().filter((product) => {
      if (selectedCategory !== 'ALL' && product.category !== selectedCategory) {
        return false;
      }
      return `${product.name} ${product.category}`.toLowerCase().includes(q);
    });
  });

  protected readonly selectedCount = computed(() => this.selectedProductIds().length);
  protected readonly allVisibleSelected = computed(() => {
    const visibleIds = this.filteredProducts().map((item) => item.id);
    if (visibleIds.length === 0) {
      return false;
    }
    return visibleIds.every((id) => this.selectedProductIds().includes(id));
  });

  protected readonly orderStatusInsights = computed(() => {
    const summary = this.filteredOrders().reduce<Record<string, number>>((acc, order) => {
      const status = this.normalizeStatus(order.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(summary)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly statusConicGradient = computed(() => {
    const palette = ['#b4410a', '#2f6fed', '#16a34a', '#ef4444', '#64748b'];
    const entries = this.orderStatusInsights();
    const total = entries.reduce((acc, entry) => acc + entry.count, 0) || 1;

    let cursor = 0;
    const slices = entries.map((entry, index) => {
      const start = Math.round((cursor / total) * 100);
      cursor += entry.count;
      const end = Math.round((cursor / total) * 100);
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    });

    return `conic-gradient(${slices.join(',')})`;
  });

  protected readonly revenueSeries = computed(() => {
    const recent = [...this.filteredOrders()].sort((a, b) => a.id - b.id).slice(-8);
    return recent.map((order) => ({ label: `#${order.id}`, value: Number(order.totalAmount || 0) }));
  });

  protected readonly revenueLabels = computed(() => this.revenueSeries().map((item) => item.label));

  protected readonly revenuePlotPoints = computed(() => {
    const series = this.revenueSeries();
    if (series.length === 0) {
      return [] as Array<{ x: number; y: number }>;
    }

    const width = 640;
    const height = 220;
    const padding = 24;
    const values = series.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return series.map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, series.length - 1);
      const normalized = (item.value - min) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return { x, y };
    });
  });

  protected readonly revenueLinePoints = computed(() => this.revenuePlotPoints().map((point) => `${point.x},${point.y}`).join(' '));

  protected readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    category: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]]
  });

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    category: ['', [Validators.required]],
    imageUrl: ['', [Validators.required]]
  });

  protected readonly userForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    address: this.fb.nonNullable.group({
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipcode: ['', [Validators.required]],
      country: ['', [Validators.required]]
    })
  });

  constructor() {
    this.reload();
  }

  protected can(permission: Parameters<PermissionsStore['can']>[0]): boolean {
    return this.permissions.can(permission);
  }

  protected setProductQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productQuery.set(input.value);
  }

  protected setDateFrom(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateFrom.set(input.value);
  }

  protected setDateTo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateTo.set(input.value);
  }

  protected setStatusFilter(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.statusFilter.set(input.value);
  }

  protected setCategoryFilter(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.categoryFilter.set(input.value);
  }

  protected setSelectedRole(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.selectedRole.set((input.value as Role) || 'CUSTOMER');
  }

  protected isRolePermissionEnabled(permission: AppPermission): boolean {
    return this.permissions.getRolePermissions(this.selectedRole()).includes(permission);
  }

  protected toggleRolePermission(permission: AppPermission, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const role = this.selectedRole();
    const current = this.permissions.getRolePermissions(role);
    const next = checked
      ? Array.from(new Set([...current, permission]))
      : current.filter((entry) => entry !== permission);

    this.permissions.setRolePermissions(role, next);
    this.log('UPDATE_ROLE_PERMISSION', 'permission', role, `${permission}=${checked}`);
    this.toast.info(`Permission ${checked ? 'enabled' : 'disabled'} for ${role}`);
  }

  protected resetRolePermissions(): void {
    const role = this.selectedRole();
    this.permissions.resetRolePermissions(role);
    this.log('RESET_ROLE_PERMISSION', 'permission', role);
    this.toast.info(`Permission defaults restored for ${role}`);
  }

  protected rollbackPermissions(versionId: string): void {
    const ok = this.permissions.rollback(versionId);
    if (ok) {
      this.log('ROLLBACK_ROLE_PERMISSION', 'permission', versionId);
      this.toast.success('Permissions rolled back');
    } else {
      this.toast.error('Could not rollback permission version');
    }
  }

  protected clearPermissionHistory(): void {
    this.permissions.clearHistory();
    this.selectedPermissionVersionId.set(null);
    this.log('CLEAR_PERMISSION_HISTORY', 'permission');
    this.toast.info('Permission history cleared');
  }

  protected featureFlagEnabled(flag: FeatureFlagKey): boolean {
    return this.flags.isEnabled(flag);
  }

  protected setFeatureFlagReason(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.featureFlagReason.set(input.value);
  }

  protected setApprovalActor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.approvalActor.set(input.value);
  }

  protected setApprovalNote(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.approvalNote.set(input.value);
  }

  protected submitToggleRequest(flag: FeatureFlagKey): void {
    const reason = this.featureFlagReason().trim();
    if (reason.length < 5) {
      this.toast.error('Please provide a feature-flag change reason (min 5 chars)');
      return;
    }

    if (this.flags.isLocked(flag)) {
      this.toast.error(`Feature flag ${flag} is locked for this environment`);
      return;
    }

    const targetEnabled = !this.flags.isEnabled(flag);
    const request = this.flags.submitToggleRequest(flag, targetEnabled, this.store.currentEmail(), reason);
    if (!request) {
      this.toast.error('Unable to create flag change request');
      return;
    }

    this.log('CREATE_FEATURE_FLAG_REQUEST', 'featureFlag', flag, `target=${targetEnabled};reason=${reason}`);
    this.toast.info('Flag change request submitted for approval');
    this.featureFlagReason.set('');
  }

  protected submitResetRequest(): void {
    const reason = this.featureFlagReason().trim();
    if (reason.length < 5) {
      this.toast.error('Please provide a reset reason (min 5 chars)');
      return;
    }

    this.flags.submitResetRequest(this.store.currentEmail(), reason);
    this.log('CREATE_FEATURE_FLAG_RESET_REQUEST', 'featureFlag', undefined, reason);
    this.toast.info('Feature flag reset request submitted');
    this.featureFlagReason.set('');
  }

  protected approveFlagRequest(requestId: string): void {
    const actor = this.approvalActor().trim() || this.store.currentEmail();
    const request = this.pendingFlagRequests().find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    if (request.createdBy === actor) {
      this.toast.error('Requester cannot approve their own flag change');
      return;
    }

    const ok = this.flags.approveRequest(requestId, actor, this.approvalNote().trim());
    if (!ok) {
      this.toast.error('Could not approve request');
      return;
    }

    this.log('APPROVE_FEATURE_FLAG_REQUEST', 'featureFlag', requestId, `actor=${actor}`);
    this.toast.success('Flag change approved and applied');
  }

  protected rejectFlagRequest(requestId: string): void {
    const actor = this.approvalActor().trim() || this.store.currentEmail();
    const request = this.pendingFlagRequests().find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    if (request.createdBy === actor) {
      this.toast.error('Requester cannot reject their own request');
      return;
    }

    const ok = this.flags.rejectRequest(requestId, actor, this.approvalNote().trim());
    if (!ok) {
      this.toast.error('Could not reject request');
      return;
    }

    this.log('REJECT_FEATURE_FLAG_REQUEST', 'featureFlag', requestId, `actor=${actor}`);
    this.toast.info('Flag change request rejected');
  }

  protected clearResolvedFlagRequests(): void {
    this.flags.clearResolvedRequests();
    this.log('CLEAR_FEATURE_FLAG_RESOLVED_REQUESTS', 'featureFlag');
    this.toast.info('Resolved requests cleared');
  }

  protected resetSloPolicy(): void {
    this.slo.resetDefaults();
    this.log('RESET_SLO_POLICY', 'observability');
    this.toast.info('SLO policy reset to defaults');
  }

  protected setSloAvailability(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.slo.setPolicy({ availabilityMinPct: Number(input.value || 0) });
  }

  protected setSloP95(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.slo.setPolicy({ p95LatencyMaxMs: Number(input.value || 0) });
  }

  protected setSloErrorRate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.slo.setPolicy({ errorRateMaxPct: Number(input.value || 0) });
  }

  protected clearObservability(): void {
    this.observability.clear();
    this.log('CLEAR_OBSERVABILITY', 'observability');
    this.toast.info('Reliability metrics cleared');
  }

  protected comparePermissions(versionId: string): void {
    this.selectedPermissionVersionId.set(versionId);
  }

  protected clearPermissionDiffView(): void {
    this.selectedPermissionVersionId.set(null);
  }

  protected setBulkCategory(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bulkCategory.set(input.value);
  }

  protected setBulkDiscount(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Math.max(0, Math.min(90, Number(input.value || 0)));
    this.bulkDiscountPercent.set(Number.isFinite(value) ? value : 0);
  }

  protected isSelected(productId: number): boolean {
    return this.selectedProductIds().includes(productId);
  }

  protected toggleSelection(productId: number): void {
    this.selectedProductIds.update((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  }

  protected toggleSelectAllVisible(): void {
    const visibleIds = this.filteredProducts().map((item) => item.id);
    if (visibleIds.length === 0) {
      return;
    }

    if (this.allVisibleSelected()) {
      this.selectedProductIds.update((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    this.selectedProductIds.update((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  protected startEdit(product: Product): void {
    this.editingProductId.set(product.id);
    this.editForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: product.category,
      imageUrl: product.imageUrl
    });
  }

  protected cancelEdit(): void {
    this.editingProductId.set(null);
  }

  protected saveEdit(): void {
    const id = this.editingProductId();
    if (!id || this.editForm.invalid || this.loading()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.api.updateProduct(id, this.editForm.getRawValue() as ProductRequest).subscribe({
      next: () => {
        this.log('UPDATE_PRODUCT', 'product', String(id), 'Inline edit save');
        this.toast.success('Product updated');
        this.editingProductId.set(null);
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected applyBulkCategory(): void {
    const ids = this.selectedProductIds();
    const category = this.bulkCategory().trim();
    if (ids.length === 0 || !category) {
      return;
    }

    const requests = ids
      .map((id) => this.products().find((product) => product.id === id))
      .filter((product): product is Product => !!product)
      .map((product) => this.api.updateProduct(product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
        category,
        imageUrl: product.imageUrl
      }).pipe(catchError(() => of(''))));

    this.loading.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.log('BULK_UPDATE_CATEGORY', 'product', ids.join(','), `Category=${category}`);
        this.toast.success('Bulk category update applied');
        this.reload();
      },
      complete: () => this.loading.set(false)
    });
  }

  protected applyBulkDiscount(): void {
    const ids = this.selectedProductIds();
    const percent = this.bulkDiscountPercent();
    if (ids.length === 0 || percent <= 0) {
      return;
    }

    const requests = ids
      .map((id) => this.products().find((product) => product.id === id))
      .filter((product): product is Product => !!product)
      .map((product) => this.api.updateProduct(product.id, {
        name: product.name,
        description: product.description,
        price: Number((product.price * (1 - percent / 100)).toFixed(2)),
        stockQuantity: product.stockQuantity,
        category: product.category,
        imageUrl: product.imageUrl
      }).pipe(catchError(() => of(''))));

    this.loading.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.log('BULK_DISCOUNT', 'product', ids.join(','), `Discount=${percent}%`);
        this.toast.success('Bulk discount applied');
        this.reload();
      },
      complete: () => this.loading.set(false)
    });
  }

  protected deleteSelectedProducts(): void {
    const ids = this.selectedProductIds();
    if (ids.length === 0) {
      return;
    }

    this.loading.set(true);
    forkJoin(ids.map((id) => this.api.deleteProduct(id).pipe(catchError(() => of(void 0))))).subscribe({
      next: () => {
        this.log('BULK_DELETE_PRODUCT', 'product', ids.join(','));
        this.selectedProductIds.set([]);
        this.toast.info('Selected products deleted');
        this.reload();
      },
      complete: () => this.loading.set(false)
    });
  }

  protected deleteOneProduct(productId: number): void {
    this.loading.set(true);
    this.api.deleteProduct(productId).subscribe({
      next: () => {
        this.log('DELETE_PRODUCT', 'product', String(productId));
        this.selectedProductIds.update((current) => current.filter((id) => id !== productId));
        this.toast.info('Product deleted');
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected exportCsv(type: 'products' | 'orders' | 'users'): void {
    const now = new Date().toISOString().slice(0, 10);

    if (type === 'products') {
      const rows = this.filteredProducts().map((p) => [p.id, p.name, p.category, p.price, p.stockQuantity, p.active]);
      this.downloadCsv(`products-${now}.csv`, ['id', 'name', 'category', 'price', 'stockQuantity', 'active'], rows);
      this.log('EXPORT_PRODUCTS_CSV', 'product');
      return;
    }

    if (type === 'orders') {
      const rows = this.filteredOrders().map((o) => [o.id, this.normalizeStatus(o.status), o.totalAmount, o.items.length, o.createdAt ?? '']);
      this.downloadCsv(`orders-${now}.csv`, ['id', 'status', 'totalAmount', 'itemsCount', 'createdAt'], rows);
      this.log('EXPORT_ORDERS_CSV', 'order');
      return;
    }

    const rows = this.users().map((u) => [u.id, u.firstName, u.lastName, u.email, u.phone, u.role]);
    this.downloadCsv(`users-${now}.csv`, ['id', 'firstName', 'lastName', 'email', 'phone', 'role'], rows);
    this.log('EXPORT_USERS_CSV', 'user');
  }

  protected exportAnalyticsSnapshot(): void {
    const rows = [
      ['metric', 'value'],
      ['totalProductsFiltered', String(this.totalProducts())],
      ['totalOrdersFiltered', String(this.totalOrders())],
      ['grossRevenueFiltered', String(this.grossRevenue())],
      ['statusFilter', this.statusFilter()],
      ['categoryFilter', this.categoryFilter()],
      ['dateFrom', this.dateFrom() || ''],
      ['dateTo', this.dateTo() || '']
    ];

    this.downloadCsv(
      `analytics-snapshot-${new Date().toISOString().slice(0, 10)}.csv`,
      rows[0],
      rows.slice(1)
    );

    this.log('EXPORT_ANALYTICS_SNAPSHOT', 'analytics');
  }

  protected exportReliabilitySnapshot(): void {
    const summary = this.reliabilitySummary();
    const now = new Date().toISOString().slice(0, 10);
    const rows = [
      ['metric', 'value'],
      ['totalEvents', String(summary.totalEvents)],
      ['totalHttpRequests', String(summary.totalHttpRequests)],
      ['failedHttpRequests', String(summary.failedHttpRequests)],
      ['avgHttpLatencyMs', String(summary.avgHttpLatencyMs)],
      ['p95HttpLatencyMs', String(summary.p95HttpLatencyMs)],
      ['p99HttpLatencyMs', String(summary.p99HttpLatencyMs)],
      ['availabilityPct', String(summary.availabilityPct)],
      ['totalErrors', String(summary.totalErrors)],
      ['lastUpdatedAt', summary.lastUpdatedAt ?? '']
    ];

    const endpointRows = this.endpointInsights().map((entry: EndpointReliabilityInsight) => [
      `endpoint:${entry.endpoint}:requests`,
      String(entry.requests)
    ]);

    this.downloadCsv(`reliability-snapshot-${now}.csv`, rows[0], [...rows.slice(1), ...endpointRows]);
    this.log('EXPORT_RELIABILITY_SNAPSHOT', 'observability');
  }

  protected saveProduct(): void {
    if (this.productForm.invalid || this.loading()) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    const payload = this.productForm.getRawValue() as ProductRequest;
    this.api.createProduct(payload).subscribe({
      next: (product) => {
        this.log('CREATE_PRODUCT', 'product', String(product.id));
        this.message.set('Product created');
        this.toast.success('Product created');
        this.resetProductForm();
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected saveUser(): void {
    if (this.userForm.invalid || this.loading()) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');

    const payload = this.userForm.getRawValue() as UserRequest;
    this.api.createUser(payload).subscribe({
      next: (text) => {
        this.log('CREATE_USER', 'user', undefined, payload.email);
        this.message.set(text || 'User created');
        this.toast.success(text || 'User created');
        this.resetUserForm();
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected resetProductForm(): void {
    this.productForm.reset({ name: '', description: '', price: 0, stockQuantity: 0, category: '', imageUrl: '' });
  }

  protected resetUserForm(): void {
    this.userForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipcode: '',
        country: ''
      }
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set('');

    let pending = 3;
    const completeOne = (): void => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.api.listProducts('', 0, 200).subscribe({
      next: (response) => this.products.set(response.content),
      error: (error) => {
        this.error.set(this.store.getErrorMessage(error));
        completeOne();
      },
      complete: () => completeOne()
    });

    this.api.listOrders().subscribe({
      next: (response) => this.orders.set(response),
      error: (error) => {
        this.error.set(this.store.getErrorMessage(error));
        completeOne();
      },
      complete: () => completeOne()
    });

    this.api.listUsers().subscribe({
      next: (response) => this.users.set(response),
      error: (error) => {
        this.error.set(this.store.getErrorMessage(error));
        completeOne();
      },
      complete: () => completeOne()
    });
  }

  private normalizeStatus(status: string): string {
    const value = (status || 'PROCESSING').toUpperCase();
    if (value.includes('DELIVER')) {
      return 'DELIVERED';
    }
    if (value.includes('SHIP')) {
      return 'SHIPPED';
    }
    if (value.includes('CANCEL')) {
      return 'CANCELLED';
    }
    return 'PROCESSING';
  }

  private getOrderDate(order: Order): string {
    if (order.createdAt) {
      const date = new Date(order.createdAt);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }

    // Fallback when backend does not provide createdAt.
    return '9999-12-31';
  }

  private downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | boolean>>): void {
    const esc = (value: string | number | boolean): string => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = [header.join(','), ...rows.map((row) => row.map(esc).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private log(action: string, entity: string, entityId?: string, details?: string): void {
    this.audit.add({
      actor: this.store.currentEmail(),
      action,
      entity,
      entityId,
      details
    });
  }
}
