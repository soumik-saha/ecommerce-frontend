import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeStore } from './home.store';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <section class="home-stack" aria-label="Storefront home">
      <section class="hero-grid" aria-label="Campaign banners">
        @for (banner of store.banners(); track banner.id; let idx = $index) {
          <article class="hero-card" [class.hero-card-alt]="idx % 2 === 1">
            <img [src]="banner.imageUrl" [alt]="banner.title" loading="eager" decoding="async">
            <div class="hero-content">
              <small>{{ banner.eyebrow }}</small>
              <h1>{{ banner.title }}</h1>
              <p>{{ banner.description }}</p>
              <a class="btn" [routerLink]="banner.ctaRoute">{{ banner.ctaText }}</a>
            </div>
          </article>
        }
      </section>

      <section class="trust-strip" aria-label="Store trust indicators">
        <article>
          <strong>24h Express Dispatch</strong>
          <p>Priority shipping on top metro pin codes and premium categories.</p>
        </article>
        <article>
          <strong>99.95% Fulfillment Accuracy</strong>
          <p>Warehouse SLA backed with real-time inventory reconciliation.</p>
        </article>
        <article>
          <strong>Secure Checkout</strong>
          <p>PCI-ready payment flows with multi-layer fraud checks.</p>
        </article>
      </section>

      <section class="page" aria-labelledby="category-title">
        <div class="toolbar">
          <h2 id="category-title" class="title">Shop By Category</h2>
          <a class="btn secondary" routerLink="/products">Explore Catalog</a>
        </div>

        <div class="category-grid">
          @for (category of store.categories(); track category.id) {
            <a class="category-card" [routerLink]="category.route" [queryParams]="{ category: category.name }" [attr.aria-label]="'View ' + category.name + ' products'">
              <h3>{{ category.name }}</h3>
              <p>{{ category.description }}</p>
            </a>
          }
        </div>
      </section>

      <section class="page" aria-labelledby="recommendation-title">
        <div class="toolbar">
          <h2 id="recommendation-title" class="title">{{ store.personalizedTitle() }}</h2>
          <button type="button" class="secondary" (click)="store.load()" [disabled]="store.loading()">Refresh Feed</button>
        </div>

        @if (store.error()) {
          <p class="error">{{ store.error() }}</p>
        }

        @if (store.loading()) {
          <div class="grid two mt-sm" aria-label="Loading recommendations">
            @for (_ of [0, 1, 2, 3]; track $index) {
              <article class="page skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line short"></div>
              </article>
            }
          </div>
        } @else {
          <div class="grid two mt-sm">
            @for (product of store.recommendations(); track product.id) {
              <app-product-card [product]="product" detailPath="/product" [showWishlistToggle]="false" />
            }
          </div>
        }
      </section>

      <section class="page" aria-labelledby="trending-title">
        <div class="toolbar">
          <h2 id="trending-title" class="title">Trending This Week</h2>
          <a class="btn secondary" routerLink="/products">See All Products</a>
        </div>

        <div class="grid two mt-sm">
          @for (product of store.trending(); track product.id) {
            <app-product-card [product]="product" detailPath="/product" [showWishlistToggle]="false" />
          }
        </div>
      </section>
    </section>
  `,
  styles: `
    .home-stack {
      display: grid;
      gap: var(--spacing-lg);
    }

    .hero-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .hero-card {
      position: relative;
      min-height: 360px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--line-soft);
      box-shadow: var(--shadow-soft);
      display: grid;
      isolation: isolate;
      background: #0f172a;
    }

    .hero-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: saturate(1.1);
      opacity: 0.86;
    }

    .hero-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0.78));
      z-index: 1;
    }

    .hero-card-alt::after {
      background: linear-gradient(170deg, rgba(122, 43, 0, 0.2), rgba(15, 23, 42, 0.8));
    }

    .hero-content {
      position: absolute;
      z-index: 2;
      inset: auto 0 0 0;
      display: grid;
      gap: 8px;
      color: #fff;
      padding: 18px;
    }

    .hero-content h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.3rem, 1.1rem + 0.8vw, 2rem);
      letter-spacing: 0.01em;
    }

    .hero-content p,
    .hero-content small {
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
    }

    .category-grid {
      display: grid;
      gap: var(--spacing-md);
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .trust-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
    }

    .trust-strip article {
      border: 1px solid var(--line-soft);
      background: linear-gradient(180deg, #ffffff 0%, #f6fbff 100%);
      border-radius: 14px;
      padding: 14px;
      box-shadow: var(--shadow-soft);
      display: grid;
      gap: 6px;
    }

    .trust-strip strong,
    .trust-strip p {
      margin: 0;
    }

    .trust-strip p {
      color: var(--ink-600);
      font-size: 0.92rem;
    }

    .category-card {
      display: grid;
      gap: 8px;
      text-decoration: none;
      color: var(--ink-900);
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--line-soft);
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .category-card:hover,
    .category-card:focus-visible {
      transform: translateY(-2px);
      box-shadow: var(--shadow-soft);
      border-color: color-mix(in oklab, var(--brand-500) 34%, var(--line-soft));
    }

    .category-card h3,
    .category-card p {
      margin: 0;
    }
  `
})
export class HomePage {
  protected readonly store = inject(HomeStore);

  constructor() {
    this.store.load();
  }
}
