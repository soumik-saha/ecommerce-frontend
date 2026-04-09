import { CatalogQuery } from '../../../state/catalog/catalog.state';

export function normalizeCatalogQuery(query: CatalogQuery): CatalogQuery {
  return {
    ...query,
    keyword: query.keyword.trim(),
    category: query.category.trim(),
    minPrice: typeof query.minPrice === 'number' && Number.isFinite(query.minPrice) ? query.minPrice : null,
    maxPrice: typeof query.maxPrice === 'number' && Number.isFinite(query.maxPrice) ? query.maxPrice : null,
    page: Math.max(0, query.page),
    size: Math.max(1, query.size)
  };
}
