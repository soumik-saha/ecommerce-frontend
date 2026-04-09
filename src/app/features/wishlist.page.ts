import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiClient } from '../core/api-client';
import { FeatureFlagsStore } from '../core/feature-flags.store';
import { Product } from '../core/models';
import { ObservabilityStore } from '../core/observability.store';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';
import { WishlistStore } from '../core/wishlist.store';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-wishlist-page',
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Wishlist</h2>
        <div class="row">
          <span class="muted">{{ products().length }} saved</span>
          <button type="button" class="secondary" (click)="reload()" [disabled]="loading()">Refresh</button>
        </div>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (advancedToolsEnabled() && !loading() && products().length > 0) {
        <section class="page p-sm mb-md">
          <div class="toolbar">
            <h3 class="section-title">Advanced Wishlist Tools</h3>
            <div class="row">
              <label class="label max-w-220">
                Sort by
                <select [value]="sortBy()" (change)="setSortBy($event)">
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="price-asc">Price (Low-High)</option>
                  <option value="price-desc">Price (High-Low)</option>
                </select>
              </label>
              <input
                type="text"
                [value]="query()"
                (input)="setQuery($event)"
                placeholder="Filter saved products"
                class="max-w-220"
                aria-label="Filter wishlist products"
              >
              <button type="button" class="secondary" (click)="moveAllToCart()" [disabled]="visibleProducts().length === 0">Move Visible to Cart</button>
              <button type="button" class="secondary" (click)="clearWishlist()" [disabled]="products().length === 0">Clear Wishlist</button>
            </div>
          </div>
        </section>
      }

      @if (loading()) {
        <div class="grid two">
          @for (_ of [0, 1, 2, 3]; track $index) {
            <article class="page skeleton-card">
              <div class="skeleton skeleton-image"></div>
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line short"></div>
            </article>
          }
        </div>
      }

      @if (!loading() && products().length === 0) {
        <p class="muted">No saved items yet. Browse <a routerLink="/products">catalog</a> to add products.</p>
      }

      @if (!loading() && visibleProducts().length > 0) {
        <div class="grid two">
          @for (product of visibleProducts(); track product.id) {
            <div class="grid">
              <app-product-card [product]="product" detailPath="/product" />
              <div class="row row-between">
                <button type="button" class="secondary" (click)="remove(product.id)">Remove</button>
                <button type="button" (click)="moveToCart(product.id)">Move to Cart</button>
              </div>
            </div>
          }
        </div>
      }
      @if (!loading() && products().length > 0 && visibleProducts().length === 0) {
        <p class="muted">No saved products match the current filter.</p>
      }

    </section>
  `
})
export class WishlistPage {
  private readonly api = inject(ApiClient);
  private readonly wishlist = inject(WishlistStore);
  private readonly store = inject(SessionStore);
  private readonly toast = inject(UiToastService);
  private readonly flags = inject(FeatureFlagsStore);
  private readonly observability = inject(ObservabilityStore);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly products = signal<Product[]>([]);
  protected readonly query = signal('');
  protected readonly sortBy = signal<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');
  protected readonly advancedToolsEnabled = computed(() => this.flags.isEnabled('advancedWishlistTools'));
  protected readonly visibleProducts = computed(() => {
    const q = this.query().trim().toLowerCase();
    const sorted = [...this.products()].sort((a, b) => {
      switch (this.sortBy()) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    if (!q) {
      return sorted;
    }

    return sorted.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(q));
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    const ids = this.wishlist.ids();
    this.error.set('');

    if (ids.length === 0) {
      this.products.set([]);
      return;
    }

    this.loading.set(true);
    const requests = ids.map((id) =>
      this.api.getProduct(id).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).subscribe({
      next: (response) => {
        const valid = response.filter((item): item is Product => !!item);
        this.products.set(valid);
        this.observability.recordUiAction('wishlist.reloaded', `count=${valid.length}`);
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected setSortBy(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.sortBy.set((input.value as 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc') || 'name-asc');
    this.observability.recordUiAction('wishlist.sort.changed', input.value);
  }

  protected setQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  protected remove(productId: number): void {
    this.wishlist.remove(productId);
    this.products.update((items) => items.filter((item) => item.id !== productId));
    this.observability.recordUiAction('wishlist.item.removed', String(productId));
    this.toast.info('Removed from wishlist');
  }

  protected moveToCart(productId: number): void {
    this.api.addCartItem(productId, 1).subscribe({
      next: () => {
        this.wishlist.remove(productId);
        this.products.update((items) => items.filter((item) => item.id !== productId));
        this.observability.recordUiAction('wishlist.item.movedToCart', String(productId));
        this.toast.success('Moved to cart');
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
      }
    });
  }

  protected moveAllToCart(): void {
    const targets = this.visibleProducts();
    if (targets.length === 0) {
      return;
    }

    this.loading.set(true);
    forkJoin(targets.map((product) => this.api.addCartItem(product.id, 1).pipe(catchError(() => of(null))))).subscribe({
      next: () => {
        const targetIds = new Set(targets.map((product) => product.id));
        this.products.update((items) => items.filter((item) => !targetIds.has(item.id)));
        targets.forEach((product) => this.wishlist.remove(product.id));
        this.observability.recordUiAction('wishlist.bulk.moveToCart', `count=${targets.length}`);
        this.toast.success(`Moved ${targets.length} items to cart`);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected clearWishlist(): void {
    const count = this.products().length;
    if (count === 0) {
      return;
    }

    this.wishlist.clear();
    this.products.set([]);
    this.observability.recordUiAction('wishlist.cleared', `count=${count}`);
    this.toast.info('Wishlist cleared');
  }
}
