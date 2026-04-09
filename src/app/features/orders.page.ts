import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { Order } from '../core/models';
import { SessionStore } from '../core/session.store';

@Component({
  selector: 'app-orders-page',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Order History</h2>
        <button type="button" class="secondary" (click)="reload()" [disabled]="loading()">Refresh</button>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (loading()) { <p class="muted">Loading order timeline...</p> }

      @if (!loading() && orders().length === 0) {
        <p class="muted">You have no orders yet. Go to <a routerLink="/products">catalog</a>.</p>
      }

      <section class="timeline" aria-label="Order timeline">
        @for (order of orders(); track order.id; let idx = $index) {
          <article class="row timeline-item">
            <div class="timeline-dot" aria-hidden="true"></div>
            <div class="page timeline-card">
              <div class="row row-between">
                <strong>Order #{{ order.id }}</strong>
                <span class="muted">{{ statusLabel(order.status) }}</span>
              </div>
              <p class="mt-sm mb-sm"><strong>Total: {{ order.totalAmount | currency:'INR' }}</strong></p>
              <p class="muted mb-sm">Items: {{ order.items.length }} • Step {{ idx + 1 }}</p>

              @for (item of order.items; track item.id) {
                <p class="muted">Product #{{ item.productId }} • Qty {{ item.quantity }} • {{ item.price | currency:'INR' }}</p>
              }
            </div>
          </article>
        }
      </section>
    </section>
  `
})
export class OrdersPage {
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly orders = signal<Order[]>([]);

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listOrders().subscribe({
      next: (response) => {
        const newestFirst = [...response].sort((a, b) => b.id - a.id);
        this.orders.set(newestFirst);
      },
      error: (error) => {
        this.error.set(this.store.getErrorMessage(error));
      },
      complete: () => this.loading.set(false)
    });
  }

  protected statusLabel(status: string): string {
    if (!status) {
      return 'Pending';
    }

    const normalized = status.toLowerCase();
    if (normalized.includes('delivered')) {
      return 'Delivered';
    }
    if (normalized.includes('shipped')) {
      return 'Shipped';
    }
    if (normalized.includes('cancel')) {
      return 'Cancelled';
    }
    return 'Processing';
  }
}
