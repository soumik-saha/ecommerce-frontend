import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { CartItem } from '../core/models';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';

@Component({
  selector: 'app-cart-page',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Your Cart</h2>
        <div class="row">
          <span class="muted">{{ items().length }} items</span>
          <a class="btn secondary" routerLink="/products">Continue shopping</a>
        </div>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (loading()) {
        <div class="grid mt-sm" aria-label="Loading cart">
          @for (_ of [0, 1, 2]; track $index) {
            <article class="row row-between list-row divider-bottom">
              <div class="w-50 skeleton skeleton-line"></div>
              <div class="w-25 skeleton skeleton-line"></div>
            </article>
          }
        </div>
      }

      @if (!loading() && items().length === 0) {
        <p class="muted">Your cart is empty.</p>
      }

      @for (item of items(); track item.product.id) {
        <article class="row cart-item divider-bottom list-row">
          <div class="cart-item-main">
            <img [src]="item.product.imageUrl" [alt]="item.product.name" loading="lazy" decoding="async" (error)="setFallbackImage($event)" class="cart-thumb">
            <div class="cart-item-info">
              <strong>{{ item.product.name }}</strong>
              <p class="muted">Qty: {{ item.quantity }} • {{ item.product.category }}</p>
            </div>
          </div>

          <div class="row">
            <input
              type="number"
              min="1"
              [value]="draftQuantity(item)"
              (input)="setDraftQuantity(item.product.id, $event)"
              class="max-w-160"
              [attr.aria-label]="'Quantity for ' + item.product.name"
            >
            <button
              type="button"
              class="secondary"
              (click)="updateQuantity(item.product.id)"
              [disabled]="updatingItemId() === item.product.id || removingItemId() === item.product.id"
            >
              {{ updatingItemId() === item.product.id ? 'Updating...' : 'Update Qty' }}
            </button>
            <span>{{ lineTotal(item) | currency:'INR' }}</span>
            <button type="button" class="secondary" (click)="remove(item.product.id)" [disabled]="removingItemId() === item.product.id">
              {{ removingItemId() === item.product.id ? 'Removing...' : 'Remove' }}
            </button>
          </div>
        </article>
      }

      <div class="row row-between mt-md">
        <p class="section-title"><strong>Total: {{ total() | currency:'INR' }}</strong></p>
        <a class="btn" routerLink="/checkout" [style.pointer-events]="items().length === 0 ? 'none' : 'auto'" [style.opacity]="items().length === 0 ? 0.6 : 1">Checkout</a>
      </div>
    </section>
  `
})
export class CartPage {
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly toast = inject(UiToastService);

  protected readonly items = signal<CartItem[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly removingItemId = signal<number | null>(null);
  protected readonly updatingItemId = signal<number | null>(null);
  protected readonly quantityDraft = signal<Record<number, number>>({});
  protected readonly total = computed(() => this.items().reduce((acc, item) => acc + this.lineTotal(item), 0));

  constructor() {
    this.reload();
  }

  protected remove(productId: number): void {
    this.removingItemId.set(productId);
    this.api.deleteCartItem(productId).subscribe({
      next: () => {
        this.toast.info('Item removed from cart');
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.removingItemId.set(null);
      }
    });
  }

  protected setDraftQuantity(productId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Math.max(1, Number(input.value || 1));
    this.quantityDraft.update((current) => ({
      ...current,
      [productId]: Number.isFinite(value) ? value : 1
    }));
  }

  protected draftQuantity(item: CartItem): number {
    return this.quantityDraft()[item.product.id] ?? Math.max(1, Number(item.quantity || 1));
  }

  protected updateQuantity(productId: number): void {
    const quantity = Math.max(1, Number(this.quantityDraft()[productId] ?? 1));
    this.updatingItemId.set(productId);

    // This API endpoint is used as an upsert quantity operation by this application.
    this.api.addCartItem(productId, quantity).subscribe({
      next: () => {
        this.toast.success('Cart quantity updated');
        this.reload();
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.updatingItemId.set(null);
      }
    });
  }

  protected lineTotal(item: CartItem): number {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const price = Number(item.price || 0);
    const productPrice = Number(item.product?.price || 0);

    if (quantity > 1 && productPrice > 0 && price <= productPrice) {
      return price * quantity;
    }

    return price;
  }

  protected setFallbackImage(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://placehold.co/160x160?text=Item';
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getCart().subscribe({
      next: (response) => {
        this.items.set(response);
        this.quantityDraft.set(
          response.reduce<Record<number, number>>((acc, item) => {
            acc[item.product.id] = Math.max(1, Number(item.quantity || 1));
            return acc;
          }, {})
        );
        this.removingItemId.set(null);
        this.updatingItemId.set(null);
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.removingItemId.set(null);
        this.updatingItemId.set(null);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
