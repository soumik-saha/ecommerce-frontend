import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../core/models';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <article class="product-card page">
      <img
        [src]="product.imageUrl"
        [alt]="product.name + ' in ' + product.category"
        loading="lazy"
        decoding="async"
        (error)="setFallbackImage($event)"
        class="product-image"
      >

      <div class="product-content">
        <h3>{{ product.name }}</h3>
        <p class="muted product-category">{{ product.category }}</p>
        <p class="product-rating" [attr.aria-label]="'Rating ' + (product.rating ?? 0) + ' out of 5 from ' + (product.reviewCount ?? 0) + ' reviews'">
          <span aria-hidden="true">★</span>
          {{ (product.rating ?? 0) | number:'1.1-1' }}
          <small class="muted">({{ product.reviewCount ?? 0 }})</small>
        </p>
        <p class="product-price">{{ product.price | currency:'INR' }}</p>
        <p class="muted product-description">{{ product.description }}</p>

        @if (showWishlistToggle) {
          <button
            type="button"
            class="secondary wishlist-btn"
            (click)="wishlistToggle.emit(product.id)"
            [attr.aria-label]="(wished ? 'Remove ' : 'Add ') + product.name + (wished ? ' from' : ' to') + ' wishlist'"
          >
            {{ wished ? 'Remove from Wishlist' : 'Add to Wishlist' }}
          </button>
        }

        <div class="row product-footer">
          <small [class]="stockClass()">{{ stockLabel() }}</small>
          <a class="btn" [routerLink]="[detailPath, product.id]">View Details</a>
        </div>
      </div>
    </article>
  `,
  styles: `
    .product-card {
      padding: 14px;
      display: grid;
      gap: 11px;
      margin: 0;
      height: 100%;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .product-card:hover,
    .product-card:focus-within {
      transform: translateY(-2px);
      border-color: color-mix(in oklab, var(--brand-500) 30%, var(--line-soft));
      box-shadow: var(--shadow-strong);
    }

    .product-image {
      width: 100%;
      aspect-ratio: 4 / 3;
      height: auto;
      object-fit: cover;
      border-radius: 12px;
      background: #f5f7fb;
    }

    .product-content {
      display: grid;
      gap: 6px;
      align-content: start;
    }

    .product-rating {
      margin: 0;
      display: inline-flex;
      gap: 6px;
      align-items: center;
      color: var(--ink-700);
      font-weight: 600;
    }

    .product-rating span {
      color: var(--brand-600);
    }

    h3 {
      margin: 0;
      font-size: 1rem;
    }

    .product-category,
    .product-description {
      margin: 0;
    }

    .product-description {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.6em;
      line-height: 1.3;
    }

    .product-price {
      font-weight: 700;
      margin: 0;
    }

    .product-footer {
      justify-content: space-between;
      margin-top: 6px;
    }

    .wishlist-btn {
      width: 100%;
    }

    .stock-ok {
      color: var(--ok-700);
    }

    .stock-low {
      color: var(--brand-600);
      font-weight: 600;
    }

    .stock-out {
      color: var(--danger-700);
      font-weight: 700;
    }
  `
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() detailPath = '/product';
  @Input() showWishlistToggle = false;
  @Input() wished = false;
  @Output() readonly wishlistToggle = new EventEmitter<number>();

  protected stockLabel(): string {
    if (this.product.stockQuantity <= 0) {
      return 'Out of stock';
    }

    if (this.product.stockQuantity <= 5) {
      return `Only ${this.product.stockQuantity} left`;
    }

    return `In stock: ${this.product.stockQuantity}`;
  }

  protected stockClass(): string {
    if (this.product.stockQuantity <= 0) {
      return 'stock-out';
    }

    if (this.product.stockQuantity <= 5) {
      return 'stock-low';
    }

    return 'stock-ok';
  }

  protected setFallbackImage(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://placehold.co/800x600?text=Product';
  }
}
