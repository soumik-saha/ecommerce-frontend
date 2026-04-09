import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { ApiClient } from './api-client';
import { environment } from '../../environments/environment';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  const api = inject(ApiClient);
  const token = store.token();
  const refreshToken = store.refreshToken();

  const base = environment.apiBaseUrl.replace(/\/+$/, '');
  const isApiCall = req.url.startsWith('/api') || req.url.startsWith(base);
  const isAuthEndpoint = /\/auth\/(login|register|logout|refresh)/.test(req.url);
  const hasRetried = req.headers.has('x-refresh-attempt');

  const request = token && isApiCall && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error) => {
      const shouldRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiCall &&
        !isAuthEndpoint &&
        !hasRetried &&
        !!refreshToken;

      if (!shouldRefresh) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          store.clear();
          void router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      return api.refresh({ refreshToken }).pipe(
        switchMap((session) => {
          store.set(session);

          return next(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
                'x-refresh-attempt': '1'
              }
            })
          );
        }),
        catchError((refreshError) => {
          store.clear();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
