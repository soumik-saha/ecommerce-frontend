import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createActionGroup, createFeature, createReducer, emptyProps, on, props } from '@ngrx/store';
import { Product } from '../../core/models';

export interface CatalogQuery {
  keyword: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: 'relevance' | 'priceAsc' | 'priceDesc' | 'nameAsc';
  page: number;
  size: number;
}

export interface CatalogCacheEntry {
  ids: number[];
  page: number;
  totalElements: number;
  totalPages: number;
  loadedAt: string;
}

export interface CatalogState {
  products: EntityState<Product, number>;
  query: CatalogQuery;
  pageNumber: number;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  cache: Record<string, CatalogCacheEntry>;
}

const adapter = createEntityAdapter<Product>({ selectId: (product) => product.id });

const initialState: CatalogState = {
  products: adapter.getInitialState(),
  query: {
    keyword: '',
    category: '',
    minPrice: null,
    maxPrice: null,
    sortBy: 'relevance',
    page: 0,
    size: 12
  },
  pageNumber: 1,
  totalElements: 0,
  totalPages: 1,
  loading: false,
  error: null,
  cache: {}
};

export const catalogActions = createActionGroup({
  source: 'Catalog',
  events: {
    QueryChanged: props<{ query: Partial<CatalogQuery> }>(),
    PageChanged: props<{ page: number }>(),
    LoadRequested: emptyProps(),
    LoadSucceeded: props<{ items: Product[]; page: number; totalElements: number; totalPages: number; queryKey: string }>(),
    CacheServed: props<{ queryKey: string }>(),
    LoadFailed: props<{ message: string }>()
  }
});

export const catalogFeature = createFeature({
  name: 'catalog',
  reducer: createReducer(
    initialState,
    on(catalogActions.QueryChanged, (state, { query }) => ({
      ...state,
      query: {
        ...state.query,
        ...query,
        page: query.page ?? 0
      }
    })),
    on(catalogActions.PageChanged, (state, { page }) => ({
      ...state,
      query: {
        ...state.query,
        page: Math.max(0, page)
      }
    })),
    on(catalogActions.LoadRequested, (state) => ({ ...state, loading: true, error: null })),
    on(catalogActions.CacheServed, (state, { queryKey }) => {
      const cached = state.cache[queryKey];
      if (!cached) {
        return state;
      }
      return {
        ...state,
        loading: false,
        error: null,
        pageNumber: cached.page + 1,
        totalElements: cached.totalElements,
        totalPages: cached.totalPages
      };
    }),
    on(catalogActions.LoadSucceeded, (state, { items, page, totalElements, totalPages, queryKey }) => ({
      ...state,
      loading: false,
      error: null,
      products: adapter.upsertMany(items, state.products),
      pageNumber: page + 1,
      totalElements,
      totalPages: Math.max(1, totalPages),
      cache: {
        ...state.cache,
        [queryKey]: {
          ids: items.map((item) => item.id),
          page,
          totalElements,
          totalPages: Math.max(1, totalPages),
          loadedAt: new Date().toISOString()
        }
      }
    })),
    on(catalogActions.LoadFailed, (state, { message }) => ({ ...state, loading: false, error: message }))
  )
});

export const catalogAdapter = adapter;
