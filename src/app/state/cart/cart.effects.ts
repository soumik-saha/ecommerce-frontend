import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { SessionStore } from '../../core/session.store';
import { cartActions } from './cart.state';

export class CartEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ApiClient);
  private readonly sessionStore = inject(SessionStore);

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cartActions.refreshRequested),
      switchMap(() =>
        this.api.getCart().pipe(
          map((items) => cartActions.refreshSucceeded({ items })),
          catchError((error: unknown) =>
            of(
              cartActions.refreshFailed({
                message: this.sessionStore.getErrorMessage(error)
              })
            )
          )
        )
      )
    )
  );
}
