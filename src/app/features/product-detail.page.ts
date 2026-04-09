import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { Product, ProductVariant } from '../core/models';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';
import { WishlistStore } from '../core/wishlist.store';

@Component({
  selector: 'app-product-detail-page',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Product Details</h2>
        <a class="btn secondary" routerLink="/products">Back to Catalog</a>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (product(); as item) {
        <div class="grid two">
          <img [src]="item.imageUrl" [alt]="item.name + ' image'" loading="lazy" decoding="async" class="product-detail-image" (error)="setFallbackImage($event)">
          <div class="grid product-detail-content">
            <h3 class="section-title">{{ item.name }}</h3>
            <p class="muted section-title">{{ item.category }}</p>
            <p class="muted section-title" [attr.aria-label]="'Average rating ' + displayRating() + ' from ' + displayReviewCount() + ' reviews'">
              {{ ratingStars() }} {{ displayRating() }} / 5 ({{ displayReviewCount() }} reviews)
            </p>
            <p class="product-price-lg">{{ item.price | currency:'INR' }}</p>
            <p class="muted section-title line-clamp-3">{{ item.description }}</p>
            <p class="muted section-title">Stock available: {{ item.stockQuantity }}</p>

            @if (item.variants?.length) {
              <fieldset class="grid" aria-label="Available product variants">
                <legend class="muted">Variants</legend>
                <div class="row">
                  @for (variant of item.variants; track variant.id) {
                    <button
                      type="button"
                      class="secondary"
                      [class.active-variant]="selectedVariantId() === variant.id"
                      [disabled]="!variant.inStock"
                      (click)="selectVariant(variant)"
                      [attr.aria-pressed]="selectedVariantId() === variant.id"
                    >
                      {{ variant.label }}: {{ variant.value }} {{ variant.inStock ? '' : '(Out)' }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (isAuthenticated()) {
              <label class="label max-w-160">
                Quantity
                <input
                  type="number"
                  [value]="quantity()"
                  min="1"
                  [max]="item.stockQuantity"
                  (input)="setQuantity($event)"
                  [attr.aria-label]="'Quantity for ' + item.name"
                >
              </label>
            }

            @if (message()) { <p class="ok">{{ message() }}</p> }

            <div class="row">
              @if (isAuthenticated()) {
                <button (click)="addToCart(item.id)" [disabled]="loading() || item.stockQuantity < 1">
                  {{ loading() ? 'Adding...' : 'Add to Cart' }}
                </button>
                <button type="button" class="secondary" (click)="toggleWishlist(item.id)" [attr.aria-label]="(isWished(item.id) ? 'Remove ' : 'Save ') + item.name + ' wishlist'">
                  {{ isWished(item.id) ? 'Remove Wishlist' : 'Save to Wishlist' }}
                </button>
              } @else {
                <a class="btn" routerLink="/login">Login to buy</a>
              }
              <a class="btn secondary" routerLink="/cart">Go to Cart</a>
            </div>
          </div>
        </div>

        <section class="page">
          <h4 class="section-title">Customer Reviews</h4>

          @if (displayReviews().length === 0) {
            <p class="muted">No reviews available yet.</p>
          }

          @for (review of displayReviews(); track review.id) {
            <article class="divider-bottom list-row">
              <div class="row row-between">
                <strong>{{ review.title }}</strong>
                <small class="muted">{{ review.createdAt | date:'mediumDate' }}</small>
              </div>
              <p class="muted">{{ starsFor(review.rating) }} {{ review.rating }}/5 by {{ review.authorName }}</p>
              <p>{{ review.comment }}</p>
            </article>
          }
        </section>
      }
    </section>
  `
})
export class ProductDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly toast = inject(UiToastService);
  private readonly wishlist = inject(WishlistStore);
  protected readonly product = signal<Product | null>(null);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly loading = signal(false);
  protected readonly quantity = signal(1);
  protected readonly selectedVariantId = signal<string | null>(null);
  protected readonly isAuthenticated = this.store.isAuthenticated;
  protected readonly displayReviews = computed(() => this.product()?.reviews ?? []);
  protected readonly displayRating = computed(() => Number(this.product()?.rating ?? 0).toFixed(1));
  protected readonly displayReviewCount = computed(() => Number(this.product()?.reviewCount ?? this.displayReviews().length));
  protected readonly ratingStars = computed(() => this.starsFor(Math.round(Number(this.product()?.rating ?? 0))));

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Invalid product id');
      return;
    }
    this.api.getProduct(id).subscribe({
      next: (response) => {
        this.product.set(response);
        const firstInStockVariant = response.variants?.find((variant) => variant.inStock)?.id ?? response.variants?.[0]?.id ?? null;
        this.selectedVariantId.set(firstInStockVariant);
      },
      error: (error) => this.error.set(this.store.getErrorMessage(error))
    });
  }

  protected starsFor(value: number): string {
    const safe = Math.min(5, Math.max(0, Math.round(value)));
    return '★★★★★'.slice(0, safe) + '☆☆☆☆☆'.slice(0, 5 - safe);
  }

  protected selectVariant(variant: ProductVariant): void {
    if (!variant.inStock) {
      return;
    }

    this.selectedVariantId.set(variant.id);
  }

  protected setQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextValue = Math.max(1, Number(input.value || 1));
    this.quantity.set(Number.isFinite(nextValue) ? nextValue : 1);
  }

  protected addToCart(productId: number): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.api.addCartItem(productId, this.quantity()).subscribe({
      next: () => {
        this.message.set('Added to cart');
        this.toast.success('Item added to cart');
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

  protected isWished(productId: number): boolean {
    return this.wishlist.isWished(productId);
  }

  protected toggleWishlist(productId: number): void {
    const added = this.wishlist.toggle(productId);
    this.toast.info(added ? 'Added to wishlist' : 'Removed from wishlist');
  }

  protected setFallbackImage(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://placehold.co/900x675?text=Product';
  }
}
