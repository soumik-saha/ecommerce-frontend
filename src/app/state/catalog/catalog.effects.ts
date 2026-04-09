import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { SessionStore } from '../../core/session.store';
import { catalogActions } from './catalog.state';
import { selectCatalogCacheEntry, selectCatalogQuery, selectCatalogQueryKey } from './catalog.selectors';

export class CatalogEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ApiClient);
  private readonly sessionStore = inject(SessionStore);
  private readonly store = inject(Store);

  readonly loadCatalog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(catalogActions.LoadRequested),
      concatLatestFrom(() => [
        this.store.select(selectCatalogQuery),
        this.store.select(selectCatalogQueryKey),
        this.store.select(selectCatalogCacheEntry)
      ]),
      switchMap(([, query, queryKey, cached]) => {
        if (cached) {
          return of(catalogActions.CacheServed({ queryKey }));
        }

        return this.api.listProducts({
          keyword: query.keyword.trim(),
          category: query.category.trim() || undefined,
          minPrice: query.minPrice ?? undefined,
          maxPrice: query.maxPrice ?? undefined,
          page: query.page,
          size: query.size
        }).pipe(
          map((response) =>
            catalogActions.LoadSucceeded({
              items: response.content ?? [],
              page: response.number ?? query.page ?? 0,
              totalElements: response.totalElements ?? 0,
              totalPages: response.totalPages ?? 1,
              queryKey
            })
          ),
          catchError((error: unknown) =>
            of(
              catalogActions.LoadFailed({
                message: this.sessionStore.getErrorMessage(error)
              })
            )
          )
        );
      })
    )
  );
}
