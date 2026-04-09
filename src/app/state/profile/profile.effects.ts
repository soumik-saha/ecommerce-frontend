import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { SessionStore } from '../../core/session.store';
import { profileActions } from './profile.state';

export class ProfileEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ApiClient);
  private readonly sessionStore = inject(SessionStore);

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.loadRequested),
      switchMap(() => {
        const userId = this.sessionStore.currentUserId();
        if (!userId) {
          return of(profileActions.loadSucceeded({ orders: [], addresses: [] }));
        }

        return forkJoin({
          orders: this.api.listOrders(),
          user: this.api.getUser(userId)
        }).pipe(
          map(({ orders, user }) => profileActions.loadSucceeded({ orders, addresses: [user.address] })),
          catchError((error: unknown) =>
            of(
              profileActions.loadFailed({
                message: this.sessionStore.getErrorMessage(error)
              })
            )
          )
        );
      })
    )
  );
}
