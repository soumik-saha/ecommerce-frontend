import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogQuery } from '../../../state/catalog/catalog.state';

@Component({
  selector: 'app-catalog-filters',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="grid two mt-sm" (ngSubmit)="applyFilters()" aria-label="Catalog filters">
      <label class="label">
        Category
        <input type="text" [(ngModel)]="localCategory" name="category" placeholder="Category">
      </label>
      <label class="label">
        Sort By
        <select [(ngModel)]="localSortBy" name="sortBy">
          <option value="relevance">Relevance</option>
          <option value="priceAsc">Price: Low to High</option>
          <option value="priceDesc">Price: High to Low</option>
          <option value="nameAsc">Name: A to Z</option>
        </select>
      </label>

      <label class="label">
        Min Price
        <input type="number" [(ngModel)]="localMinPrice" name="minPrice" min="0" placeholder="0">
      </label>
      <label class="label">
        Max Price
        <input type="number" [(ngModel)]="localMaxPrice" name="maxPrice" min="0" placeholder="50000">
      </label>

      <div class="row address-grid-full">
        <button type="button" class="secondary" (click)="resetFilters()">Reset</button>
        <button type="submit">Apply</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogFiltersComponent {
  readonly query = input.required<CatalogQuery>();
  readonly changed = output<Partial<CatalogQuery>>();

  protected localCategory = '';
  protected localSortBy: CatalogQuery['sortBy'] = 'relevance';
  protected localMinPrice: number | null = null;
  protected localMaxPrice: number | null = null;

  ngOnInit(): void {
    const query = this.query();
    this.localCategory = query.category;
    this.localSortBy = query.sortBy;
    this.localMinPrice = query.minPrice;
    this.localMaxPrice = query.maxPrice;
  }

  protected applyFilters(): void {
    this.changed.emit({
      category: this.localCategory,
      sortBy: this.localSortBy,
      minPrice: this.localMinPrice,
      maxPrice: this.localMaxPrice
    });
  }

  protected resetFilters(): void {
    this.localCategory = '';
    this.localSortBy = 'relevance';
    this.localMinPrice = null;
    this.localMaxPrice = null;
    this.applyFilters();
  }
}
