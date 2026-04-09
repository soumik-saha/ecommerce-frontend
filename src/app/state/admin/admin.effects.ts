import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AdminDatasource } from '../../features/admin/data-access/admin.datasource';
import { SessionStore } from '../../core/session.store';
import { adminActions } from './admin.state';

export class AdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly datasource = inject(AdminDatasource);
  private readonly sessionStore = inject(SessionStore);

  readonly loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminActions.DashboardRequested),
      switchMap(() =>
        this.datasource.loadDashboard().pipe(
          map((payload) =>
            adminActions.DashboardSucceeded({
              products: payload.products,
              users: payload.users,
              orders: payload.orders
            })
          ),
          catchError((error: unknown) =>
            of(
              adminActions.DashboardFailed({
                message: this.sessionStore.getErrorMessage(error)
              })
            )
          )
        )
      )
    )
  );
}
