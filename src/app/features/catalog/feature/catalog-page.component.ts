import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ProductCardComponent } from '../../../shared/product-card.component';
import { DsPaginationComponent } from '../../../design-system/composite/pagination/ds-pagination.component';
import { DsSkeletonComponent } from '../../../design-system/feedback/skeleton/ds-skeleton.component';
import { CatalogFiltersComponent } from '../ui/catalog-filters.component';
import { catalogActions, CatalogQuery } from '../../../state/catalog/catalog.state';
import {
  selectCatalogError,
  selectCatalogLoading,
  selectCatalogPageNumber,
  selectCatalogProducts,
  selectCatalogQuery,
  selectCatalogTotalElements,
  selectCatalogTotalPages
} from '../../../state/catalog/catalog.selectors';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, DsPaginationComponent, DsSkeletonComponent, CatalogFiltersComponent],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Product Catalog</h2>
        @if (totalElements() > 0) {
          <span class="muted">{{ totalElements() }} items</span>
        }
      </div>

      <form class="row" (ngSubmit)="search()" aria-label="Catalog keyword search">
        <label class="label content-flex-1">
          <span class="sr-only">Search products</span>
          <input type="text" [(ngModel)]="keyword" name="keyword" placeholder="Search products by keyword" aria-label="Search products">
        </label>
        <button type="submit" [disabled]="loading()">{{ loading() ? 'Searching...' : 'Search' }}</button>
        <button type="button" class="secondary" (click)="toggleFilters()">{{ showFilters() ? 'Hide' : 'Show' }} Filters</button>
      </form>

      @if (showFilters()) {
        <app-catalog-filters [query]="query()" (changed)="updateFilters($event)" />
      }

      @if (error()) {
        <p class="error mt-sm">{{ error() }}</p>
      }

      @if (loading()) {
        <ds-skeleton-grid ariaLabel="Loading products" [count]="6" />
      } @else {
        <div class="grid two mt-sm" aria-label="Product results">
          @for (product of products(); track product.id) {
            <app-product-card [product]="product" detailPath="/product" [showWishlistToggle]="false" />
          }
        </div>
      }

      @if (!loading() && products().length === 0) {
        <p class="muted mt-md">No products found.</p>
      }

      @if (!loading() && totalPages() > 1) {
        <ds-pagination
          [currentPage]="pageNumber()"
          [totalPages]="totalPages()"
          (previous)="previousPage()"
          (next)="nextPage()"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogPageComponent {
  private readonly store = inject(Store);

  protected readonly query = this.store.selectSignal(selectCatalogQuery);
  protected readonly products = this.store.selectSignal(selectCatalogProducts);
  protected readonly loading = this.store.selectSignal(selectCatalogLoading);
  protected readonly error = this.store.selectSignal(selectCatalogError);
  protected readonly pageNumber = this.store.selectSignal(selectCatalogPageNumber);
  protected readonly totalPages = this.store.selectSignal(selectCatalogTotalPages);
  protected readonly totalElements = this.store.selectSignal(selectCatalogTotalElements);

  protected readonly showFilters = signal(false);
  protected keyword = '';

  constructor() {
    this.keyword = this.query().keyword;
    this.store.dispatch(catalogActions.loadRequested());
  }

  protected search(): void {
    this.store.dispatch(catalogActions.queryChanged({ query: { keyword: this.keyword, page: 0 } }));
    this.store.dispatch(catalogActions.loadRequested());
  }

  protected toggleFilters(): void {
    this.showFilters.update((value) => !value);
  }

  protected updateFilters(changes: Partial<CatalogQuery>): void {
    this.store.dispatch(catalogActions.queryChanged({ query: { ...changes, page: 0 } }));
    this.store.dispatch(catalogActions.loadRequested());
  }

  protected nextPage(): void {
    const current = this.query().page;
    this.store.dispatch(catalogActions.pageChanged({ page: current + 1 }));
    this.store.dispatch(catalogActions.loadRequested());
  }

  protected previousPage(): void {
    const current = this.query().page;
    this.store.dispatch(catalogActions.pageChanged({ page: Math.max(0, current - 1) }));
    this.store.dispatch(catalogActions.loadRequested());
  }
}
