import { createSelector } from '@ngrx/store';
import { Product } from '../../core/models';
import { catalogAdapter, catalogFeature } from './catalog.state';

const entitySelectors = catalogAdapter.getSelectors();

export const selectCatalogQuery = catalogFeature.selectQuery;
export const selectCatalogLoading = catalogFeature.selectLoading;
export const selectCatalogError = catalogFeature.selectError;
export const selectCatalogPageNumber = catalogFeature.selectPageNumber;
export const selectCatalogTotalPages = catalogFeature.selectTotalPages;
export const selectCatalogTotalElements = catalogFeature.selectTotalElements;

export const selectCatalogQueryKey = createSelector(selectCatalogQuery, (query) => {
  return [query.keyword.trim(), query.category.trim(), query.minPrice ?? '', query.maxPrice ?? '', query.page, query.size].join('|');
});

export const selectCatalogCacheEntry = createSelector(
  catalogFeature.selectCache,
  selectCatalogQueryKey,
  (cache, key) => cache[key]
);

export const selectCatalogProducts = createSelector(
  catalogFeature.selectState,
  selectCatalogCacheEntry,
  selectCatalogQuery,
  (state, cacheEntry, query): Product[] => {
    const ids = cacheEntry?.ids ?? [];
    const items = ids.length > 0 ? ids.map((id) => state.products.entities[id]).filter((item): item is Product => !!item) : entitySelectors.selectAll(state.products);

    switch (query.sortBy) {
      case 'priceAsc':
        return [...items].sort((a, b) => a.price - b.price);
      case 'priceDesc':
        return [...items].sort((a, b) => b.price - a.price);
      case 'nameAsc':
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return items;
    }
  }
);
