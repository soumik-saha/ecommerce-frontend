import { Product } from '../../../core/models';

export type CatalogSort = 'relevance' | 'priceAsc' | 'priceDesc' | 'nameAsc';

export interface CatalogViewModel {
  items: Product[];
  loading: boolean;
  error: string | null;
  pageNumber: number;
  totalPages: number;
  totalElements: number;
}
