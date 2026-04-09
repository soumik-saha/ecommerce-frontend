import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { Product } from '../core/models';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';
import { WishlistStore } from '../core/wishlist.store';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-products-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProductCardComponent],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Product Catalog</h2>
        <div class="row">
          @if (totalElements() > 0) {
            <span class="muted">{{ totalElements() }} items</span>
          }
          @if (isAdmin()) {
            <a class="btn secondary" routerLink="/admin">Admin Console</a>
          }
          <button type="button" class="secondary" (click)="toggleFilters()">
            {{ showFilters() ? 'Hide Filters' : 'Filters & Sort' }}
          </button>
        </div>
      </div>

      <form class="row" [formGroup]="form" (ngSubmit)="search()">
        <input type="text" formControlName="keyword" placeholder="Search products by keyword" class="max-w-360" aria-label="Search products by keyword">
        <button [disabled]="loading()">{{ loading() ? 'Searching...' : 'Search' }}</button>
      </form>

      @if (showFilters()) {
        <form class="grid two mt-sm" [formGroup]="form" aria-label="Product filters and sort controls">
          <label class="label">
            Category
            <input type="text" formControlName="category" placeholder="Shoes, Electronics, Fashion">
          </label>
          <label class="label">
            Sort By
            <select formControlName="sortBy" (change)="applyClientView()">
              <option value="relevance">Relevance</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="nameAsc">Name: A to Z</option>
            </select>
          </label>

          <label class="label">
            Min Price
            <input type="number" min="0" formControlName="minPrice" placeholder="0">
          </label>
          <label class="label">
            Max Price
            <input type="number" min="0" formControlName="maxPrice" placeholder="50000">
          </label>

          <div class="row address-grid-full">
            <button type="button" class="secondary" (click)="resetFilters()" [disabled]="loading()">Reset Filters</button>
            <button type="button" (click)="search()" [disabled]="loading()">Apply</button>
          </div>
        </form>
      }

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (loading()) {
        <div class="grid two mt-sm" aria-label="Loading products">
          @for (_ of skeletonIndexes; track $index) {
            <article class="page skeleton-card">
              <div class="skeleton skeleton-image"></div>
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line short"></div>
              <div class="skeleton skeleton-line"></div>
            </article>
          }
        </div>
      }

      @if (!loading()) {
        <div class="grid two mt-sm" aria-label="Product results">
          @for (item of viewProducts(); track item.id) {
            <app-product-card
              [product]="item"
              detailPath="/product"
              [showWishlistToggle]="isAuthenticated()"
              [wished]="isWished(item.id)"
              (wishlistToggle)="toggleWishlist($event)"
            />
          }
        </div>
      }

      @if (!loading() && viewProducts().length === 0) {
        <p class="muted mt-md">No products found for this search.</p>
      }

      @if (!loading() && totalPages() > 1) {
        <div class="row row-between mt-md" aria-label="Pagination controls">
          <span class="muted">
            Page {{ pageNumber() }} of {{ totalPages() }}
          </span>
          <div class="row">
            <button type="button" class="secondary" (click)="previous()" [disabled]="!hasPrevious() || loading()">Previous</button>
            <button type="button" class="secondary" (click)="next()" [disabled]="!hasNext() || loading()">Next</button>
          </div>
        </div>
      }
    </section>
  `
})
export class ProductsPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly toast = inject(UiToastService);
  private readonly wishlist = inject(WishlistStore);

  protected readonly isAdmin = this.store.isAdmin;
  protected readonly isAuthenticated = this.store.isAuthenticated;
  protected readonly showFilters = signal(false);
  protected readonly pageIndex = signal(0);
  protected readonly products = signal<Product[]>([]);
  protected readonly viewProducts = signal<Product[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly pageNumber = signal(1);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly hasNext = computed(() => this.pageNumber() < this.totalPages());
  protected readonly hasPrevious = computed(() => this.pageNumber() > 1);
  protected readonly skeletonIndexes = [0, 1, 2, 3, 4, 5];
  protected readonly form = this.fb.nonNullable.group({
    keyword: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'relevance'
  });

  constructor() {
    const category = this.route.snapshot.queryParamMap.get('category');
    if (category) {
      this.form.controls.category.setValue(category);
      this.showFilters.set(true);
    }

    this.load();
  }

  protected search(): void {
    this.pageIndex.set(0);
    this.load();
  }

  protected next(): void {
    if (this.hasNext()) {
      this.pageIndex.update((v) => v + 1);
      this.load();
    }
  }

  protected previous(): void {
    if (this.hasPrevious()) {
      this.pageIndex.update((v) => Math.max(0, v - 1));
      this.load();
    }
  }

  protected toggleFilters(): void {
    this.showFilters.update((value) => !value);
  }

  protected resetFilters(): void {
    this.form.patchValue({
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'relevance'
    });
    this.search();
  }

  protected applyClientView(): void {
    const category = this.form.controls.category.value.trim().toLowerCase();
    const minPrice = Number(this.form.controls.minPrice.value);
    const maxPrice = Number(this.form.controls.maxPrice.value);
    const hasMin = Number.isFinite(minPrice) && this.form.controls.minPrice.value !== '';
    const hasMax = Number.isFinite(maxPrice) && this.form.controls.maxPrice.value !== '';

    let next = [...this.products()];

    if (category) {
      next = next.filter((item) => item.category.toLowerCase().includes(category));
    }
    if (hasMin) {
      next = next.filter((item) => item.price >= minPrice);
    }
    if (hasMax) {
      next = next.filter((item) => item.price <= maxPrice);
    }

    switch (this.form.controls.sortBy.value) {
      case 'priceAsc':
        next.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        next.sort((a, b) => b.price - a.price);
        break;
      case 'nameAsc':
        next.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    this.viewProducts.set(next);
  }

  protected isWished(productId: number): boolean {
    return this.wishlist.isWished(productId);
  }

  protected toggleWishlist(productId: number): void {
    const added = this.wishlist.toggle(productId);
    this.toast.info(added ? 'Added to wishlist' : 'Removed from wishlist');
  }

  private load(): void {
    this.error.set('');
    this.loading.set(true);
    const minPrice = Number(this.form.controls.minPrice.value);
    const maxPrice = Number(this.form.controls.maxPrice.value);

    this.api.listProducts({
      keyword: this.form.controls.keyword.value.trim(),
      page: this.pageIndex(),
      size: 12,
      category: this.form.controls.category.value.trim() || undefined,
      minPrice: Number.isFinite(minPrice) && this.form.controls.minPrice.value !== '' ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) && this.form.controls.maxPrice.value !== '' ? maxPrice : undefined
    }).subscribe({
      next: (response) => {
        this.products.set(response.content ?? []);
        this.totalElements.set(response.totalElements ?? 0);
        this.totalPages.set(Math.max(1, response.totalPages ?? 1));
        this.pageNumber.set((response.number ?? 0) + 1);
        this.applyClientView();
      },
      error: (error) => {
        this.products.set([]);
        this.viewProducts.set([]);
        this.totalElements.set(0);
        this.totalPages.set(1);
        this.pageNumber.set(1);
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
